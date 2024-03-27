#!/bin/bash

HOME='/home/linaro'
serverType=$1
echo $serverType


if [ "$serverType" == "TEST" ];
then
     server="https://test.clouzer.com"
     nameSpace=${serverType}_123
     serverfile="https://test.clouzer.com"
elif [ "$serverType" == "DEV" ]; 
then
    server="https://dev.clouzer.com"
    nameSpace=${serverType}_123
    serverfile="https://dev.clouzer.com"
else
    server="https://modus.clouzer.com"
    nameSpace=TEST_123
    serverfile="https://test.clouzer.com"
fi

echo $server
echo $nameSpace
echo $serverfile

function getMac(){

    echo "check network interface:::::::::::::::::::::::::"
    # Get all network interfaces
    # Get all network interfaces starting with 'e'
    interfaces=$(ip -o link show | awk -F': ' '{print $2}' | grep '^e')

    # Loop through interfaces and check if they are activated
    for interface in $interfaces; do
    status=$(ip -o link show dev $interface | awk '{print $9}')

    if [[ $status == UP ]]; then
        echo "Interface $interface is activated"
    else
        echo "Interface $interface is not activated"
    fi
    done

    echo "interfaces ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::$interface"
    macId=`ip link show $interface | awk '/ether/ {print $2}'`
    echo "mac: address::::::::::::::::$macId"
    MAC=`echo "$macId" | tr '[:lower:]' '[:upper:]'`
    echo "MAC ::::::::::::::::: $MAC"
}

function sendPercentage(){
    curl --location 'https://modus.clouzer.com/hub/installation/perc' \
--header 'username: release.user' \
--header 'password: IUAjJCUpKComK189LQ==' \
--header 'Content-Type: application/json' \
-d "$(printf '{"macId":"%s","namespaceId":"%s","serial":"%s","modelNumber":"%s","percentage":"%s","keyVal":"%s","stage":"%s"}' "$MAC" "$nameSpace" "$serial" "$cml_model_no" "$1" "$hubkeyval" "$2")"

echo "sendPercenatge   $1 $2"

}



function registerhub(){
echo "in ACK stock by mac"
response=$(curl --location --request GET 'https://modus.clouzer.com/hub/ackStockByMac' \
--header 'username: release.user' \
--header 'password: IUAjJCUpKComK189LQ==' \
--header 'Content-Type: application/json' \
-d "$(printf '{"macId": "%s", "namespaceId": "%s"}' "$MAC" "$nameSpace")"
)
# Display the output
echo "ACK stock by mac Response: $response"
echo "Send Percenatge for ACK_STOCK_BY_MAC Response: $response"
cml_status=$(echo "$response" | jq -r '.CML_STATUS')

echo "CML_STATUS: $cml_status"

if [ $cml_status -eq 0 ] || [ $cml_status -eq 2 ]; then
    echo "Stop the process"
    exit 0  # Exit the process if cml_status is 0 or 2
elif [ $cml_status -eq 1 ]; then
    echo "Continuing the shell script as cml_status is 2"
    #sendPercentage 20

echo "Write filess into database"
# Extract the value of "CML_HUB_TYPE" key using jq
hubType=$(echo "$response" | jq -r '.CML_HUB_TYPE')
cml_model_no=$(echo "$response" | jq -r '.CML_MODEL_NO')
serial=$(echo "$response" | jq -r '.CML_SERIAL_NO')
coded_hubId=$(echo "$response" | jq -r '.CODED_HUBID')
manufacturerID=$(echo "$response" | jq -r '.ORG_PROJECT_ID')
generation=$(echo "$response" | jq -r '.version')
hubSubscription=$(echo "$response" | jq -r '.CML_HUB_SUBSCRIPTION')
deploymentType=$(echo "$response" | jq -r '.CML_HUB_DEPLOYMENT_TYPE')
#server='https://test.clouzer.com'
echo $serverfile     

# Display the value

sudo echo $serial > /home/linaro/db/serial
sudo echo $coded_hubId > /home/linaro/db/CODED_HUBID
sudo echo '' > /home/linaro/db/mesh
sudo echo $manufacturerID > /home/linaro/db/manufacturerID
sudo echo $cml_model_no > /home/linaro/db/modelNumber
sudo echo $serverfile > /home/linaro/db/server

echo "database writed successfully"

sendPercentage 30 2

echo "Set Environment "
date=`date +%s%3N`
sudo sh -c "echo 'CML_INSTALATION_DATE=${date}' > /etc/environment"
sudo sh -c "echo 'CML_GENERATION=${generation}' >> /etc/environment"
sudo sh -c "echo 'HUB_TYPE=${hubType}' >> /etc/environment"
sudo sh -c "echo 'CML_HUB_TYPE=${hubType}' >> /etc/environment"
sudo sh -c "echo 'CML_HUB_SUBSCRIPTION=${hubSubscription}' >> /etc/environment"
sudo sh -c "echo 'HubSub=${hubSubscription}' >> /etc/environment"
sudo sh -c "echo 'hubDeploymentType=${deploymentType}' >> /etc/environment"
sudo sh -c "echo 'portalSetupFlag=true' >> /etc/environment"

sendPercentage 40 2
echo "Environment Setup Successfully"
else
    echo "cml_status does not meet the specified conditions."
    exit 0
fi
}



function downloadFirmware(){

printos=`lsb_release -d|awk '{print $2}'`
os=$(echo "$printos" | tr '[:upper:]' '[:lower:]')
echo "Download firmware for $os"
    
curl --location --request GET "https://modus.clouzer.com/firmwares/latestVersion/$os/prod/test/firmware.properties" > /home/linaro/db/firmware.properties

sendPercentage 50 2
firmware_data=`cat /home/linaro/db/firmware.properties`
   
# Transform JSON data using jq
formatted_data=$(echo "$firmware_data" | sudo jq -r 'to_entries | .[] | select(.key | ascii_downcase) | "\(.key | ascii_downcase) = \(.value)"' | sort)
   
   
output="[firmware]
$formatted_data"
    echo "firmware herrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr---------------------------- $output"
    # Save the output to a file
    output_file="firmware.properties"
    echo  "$output" > "$output_file"
   
    echo "Formatted data saved to $output_file"
   
    cat $output_file
    echo '//////////////////////////////////////////////////////'
    echo 'create db  files in it'
    CODED_HUBID=`cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 12`
    cp $output_file /home/linaro/db/firmware.properties
        env_count=`wc -l /etc/environment|cut -d " " -f1`
        echo "$env_count"
            if [ $env_count -lt 2 -a ! -s /home/linaro/db/firmware.properties ];then
            echo "***************"
        echo "ERROR: Issue in fetchserial execution... check /etc/environment and firmware.properties file "
        echo "***************"
        cat /etc/environment
            cat /home/linaro/db/firmware.properties
        exit 1;
        else
        cat /etc/environment
        cat /home/linaro/db/firmware.properties
        fi

        if [ "$serverType" == "TEST" ] && [ "$hubType" == "alpha"]
        then
            reposerver="test.clouzer.com"
            nameSpace=${serverType}_123
        elif [ "$serverType" == "DEV" ]; 
        then
            reposerver="hubrepo.clouzerindia.com"
            nameSpace=${serverType}_123
        else
            reposerver="modus.clouzer.com"
            nameSpace=TEST_123
            serverType=TEST
        fi

        cd $HOME
        #source /etc/environment
   
        MountpointDB=`sudo docker volume inspect db|grep Mountpoint|awk -F : '{ print $2}'|tr -d " \""|tr -d ","`
        MountpointNode=`sudo docker volume inspect node_modules|grep Mountpoint|awk -F : '{ print $2}'|tr -d " \""|tr -d ","`
        echo "Setting Hostname"
        serial=`cat $MountpointDB/serial`
        sudo -u root bash -c "echo "$serial" > /etc/hostname"
        sudo sed -i '/127.0.1.1/d' /etc/hosts && echo "127.0.1.1 $serial" | sudo tee -a /etc/hosts || echo "127.0.1.1 $serial"
   
        hubver=`cat $MountpointDB/firmware.properties|grep ^soulhub|awk '{print $3}'`    
        depver=`cat $MountpointDB/firmware.properties|grep ^dependency|awk '{print $3}'`
        modulever=`cat $MountpointDB/firmware.properties|grep ^module|awk '{print $3}'`
        soundver=`cat $MountpointDB/firmware.properties|grep ^sound|awk '{print $3}'`
        portalver=`cat $MountpointDB/firmware.properties|grep ^portal|awk '{print $3}'`
        systemver=`cat $MountpointDB/firmware.properties|grep ^soulsystem|awk '{print $3}'`
        voicever=`cat $MountpointDB/firmware.properties|grep ^voicekit|awk '{print $3}'`
        souldapiver=`cat $MountpointDB/firmware.properties|grep ^souldapi|awk '{print $3}'`
        pyver=`cat $MountpointDB/firmware.properties|grep ^pyprocess|awk '{print $3}'`
   
        echo 'firmware hereeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        echo $hubver $depver $modulever  $soundver $portalver $systemver $voicever $souldapiver $pyver
   
        arch=`dpkg --print-architecture`
        hubtype=$hubType
        echo $hubType
        hubos=`lsb_release -d|awk '{print $2}'`
   
        echo "***************"
        echo "Pulling Docker images"
        echo "***************"
   
        sudo docker pull $reposerver:5443/soulhub:$hubver-$arch-$hubType-$hubos-${serverType,,}
        sudo docker tag $reposerver:5443/soulhub:$hubver-$arch-$hubType-$hubos-${serverType,,} soulhub
        sudo docker rmi $reposerver:5443/soulhub:$hubver-$arch-$hubType-$hubos-${serverType,,}
   
        sudo docker pull $reposerver:5443/portal:$portalver-$arch-$hubType-$hubos-${serverType,,}
        sudo docker tag $reposerver:5443/portal:$portalver-$arch-$hubType-$hubos-${serverType,,} portal
        sudo docker rmi $reposerver:5443/portal:$portalver-$arch-$hubType-$hubos-${serverType,,}
   
        sudo docker pull $reposerver:5443/pyprocess:$pyver-$arch-$hubType-$hubos-${serverType,,}
        sudo docker tag $reposerver:5443/pyprocess:$pyver-$arch-$hubType-$hubos-${serverType,,} pyprocess
        sudo docker rmi $reposerver:5443/pyprocess:$pyver-$arch-$hubType-$hubos-${serverType,,}
   
        sudo docker pull $reposerver:5443/souldapi:$souldapiver-$arch-$hubType-$hubos-${serverType,,}
        sudo docker tag $reposerver:5443/souldapi:$souldapiver-$arch-$hubType-$hubos-${serverType,,} souldapi
        sudo docker rmi $reposerver:5443/souldapi:$souldapiver-$arch-$hubType-$hubos-${serverType,,}
       
        arrayimage=("soulsystem" "weeklydb" "udpserver" "diagnostic" "startstandalone")
        echo "in array===================================================================>"
        for image in "${arrayimage[@]}"
        do
        echo "========================================================>"
        echo $image
        sudo docker pull $reposerver:5443/$image:$systemver-$arch-$hubtype-$hubos-${serverType,,}
        sudo docker tag $reposerver:5443/$image:$systemver-$arch-$hubtype-$hubos-${serverType,,} $image
        sudo docker rmi $reposerver:5443/$image:$systemver-$arch-$hubtype-$hubos-${serverType,,}
        done
        sendPercentage 70 2
        echo "*******************"
        echo "Download sound file"
        url="https://$reposerver/V2HUB/DOCKER/$hubtype/$hubSubscription/$hubos/sound/$soundver.tar.gz"
        sound_url=$(echo $url | awk '{print tolower($0)}' | sed 's/v2hub/V2HUB/g; s/docker/DOCKER/g; s/prod/PROD/g; s/basic/BASIC/g; s/debian/DEBIAN/g; s/ubuntu/UBUNTU/g; s/sound/SOUND/g')
        echo $sound_url
        echo '::::::::::::::::::::::::::::::::::::::'
        wget -O sounds.tar.gz $sound_url
        tar -xf /home/linaro/sounds.tar.gz -C /var/lib/docker/volumes/sounds/_data
        echo "sound file is extracted successfully"
        sendPercentage 80 2

}


function setcrontab(){
echo "Setting Crontab "
sudo crontab -r
echo -e "@reboot /home/linaro/Docker_scripts/soulScripts/Start_dockerContainer.sh > /home/linaro/container_process.log 2>&1" > $HOME/docker_root_crontab
echo -e "00 00 * * 7 /home/linaro/DockerV2/weeklydb.sh > /home/linaro/DockerV2/weeklydb.log 2>&1" >> $HOME/docker_root_crontab
echo -e "*/10 * * * * /home/linaro/Docker_scripts/soulScripts/processMonitor.sh >> /home/linaro/logs/core/processMonitor.log 2>&1" >> $HOME/docker_root_crontab
echo -e "*/5 * * * * /home/linaro/Docker_scripts/soulScripts/DockerStatus.sh >> /home/linaro/logs/core/DockerStatus.log 2>&1" >> $HOME/docker_root_crontab
echo -e "0 0 * * * /home/linaro/Docker_scripts/soulScripts/logRotate.sh" >> $HOME/docker_root_crontab
echo -e "0 0 1 * * docker system prune -f > /home/linaro/docker_prune.log" >> $HOME/docker_root_crontab
cat $HOME/docker_root_crontab | sudo crontab -
echo "Crontab Sets Successfully"
sendPercentage 90 2
}

function validateAll(){
    echo "Check db files present or not"
    folder_path="/home/linaro/db"
    files=("serial" "server" "CODED_HUBID" "manufacturerID" "modelNumber" "firmware.properties")

    # Function to check if a file is non-empty
    function is_non_empty() {
        if [ -s "$1" ]; then
            return 0  # File is non-empty
        else
            return 1  # File is empty
        fi
        }

        for file in "${files[@]}"; 
        do
        file_path="$folder_path/$file"
        if [ -e "$file_path" ]; 
        then
            if is_non_empty "$file_path"; 
            then
                echo "File $file_path is non-empty."
            else
                echo "File $file_path is empty."
            fi
        else
            echo "File $file_path does not exist."
        fi
        done

    echo "Check environment parameters"

    parameters=("CML_INSTALATION_DATE" "CML_GENERATION" "HUB_TYPE" "CML_HUB_TYPE" "CML_HUB_SUBSCRIPTION" "HubSub" "hubDeploymentType" "portalSetupFlag")

    # Check if /etc/environment file exists
        if [ -e "/etc/environment" ]; then
            # Loop through parameters
            for param in "${parameters[@]}"; do
                # Check if the parameter exists in /etc/environment
                if grep -q "^$param=" /etc/environment; then
                    echo "Parameter '$param' exists in /etc/environment."
                else
                    echo "Parameter '$param' does not exist in /etc/environment."
                fi
            done
        else
            echo "/etc/environment file does not exist."
        fi


    echo "Check all docker images present"

    # List of Docker images to check
        images=("soulhub" "portal" "pyprocess" "souldapi" "soulsystem" "weeklydb" "udpserver" "diagnostic" "startstandalone")

        # Loop through images
        for image in "${images[@]}"; do
            # Check if the Docker image exists
            if docker image inspect "$image" &> /dev/null; then
                echo "Docker image '$image' exists."
            else
                echo "Docker image '$image' does not exist."
            fi
        done

    echo "Check cronjobs"

        crontab_content=$(crontab -l 2>/dev/null)

        if [ -z "$crontab_content" ]; then
            echo "Crontab is empty for the current user."
            cat $HOME/docker_root_crontab | sudo crontab -
        else
            echo "Crontab is not empty for the current user."
        fi

sendPercentage 100 2

}
getMac
registerhub
downloadFirmware
setcrontab
validateAll
#sudo reboot


