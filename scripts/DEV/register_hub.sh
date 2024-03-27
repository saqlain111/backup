#!/bin/bash

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
response=$(curl --location --request GET 'https://modus.clouzer.com/hub/ackStockByMac' \
--header 'username: release.user' \
--header 'password: IUAjJCUpKComK189LQ==' \
--header 'Content-Type: application/json' \
-d "$(printf '{"macId": "%s", "namespaceId": "%s"}' "$MAC" "DEV_123")"
)
# Display the output
echo "ACK stock by mac Response: $response"

# Extract the value of "CML_HUB_TYPE" key using jq
hubType=$(echo "$response" | jq -r '.CML_HUB_TYPE')
echo ":::::::::::::::::::::::::::::::::::::"
cml_model_no=$(echo "$response" | jq -r '.CML_MODEL_NO')
serial=$(echo "$response" | jq -r '.CML_SERIAL_NO')
coded_hubId=$(echo "$response" | jq -r '.CODED_HUBID')
manufacturerID=$(echo "$response" | jq -r '.ORG_PROJECT_ID')
generation=$(echo "$response" | jq -r '.version')
hubSubscription=$(echo "$response" | jq -r '.CML_HUB_SUBSCRIPTION')
deploymentType=$(echo "$response" | jq -r '.CML_HUB_DEPLOYMENT_TYPE')
server='https://test.clouzer.com'
echo "server======================="
echo $server
# Display the value

sudo echo $serial > /home/linaro/db/serial
sudo echo $coded_hubId > /home/linaro/db/CODED_HUBID
sudo echo '' > /home/linaro/db/mesh
sudo echo $manufacturerID > /home/linaro/db/manufacturerID
sudo echo $cml_model_no > /home/linaro/db/modelNumber
sudo echo $server > /home/linaro/db/server

date=`date +%s%3N`
sudo sh -c "echo 'CML_INSTALATION_DATE=${date}' > /etc/environment"
sudo sh -c "echo 'CML_GENERATION=${generation}' >> /etc/environment"
sudo sh -c "echo 'HUB_TYPE=${hubType}' >> /etc/environment"
sudo sh -c "echo 'CML_HUB_TYPE=${hubType}' >> /etc/environment"
sudo sh -c "echo 'CML_HUB_SUBSCRIPTION=${hubSubscription}' >> /etc/environment"
sudo sh -c "echo 'HubSub=${hubSubscription}' >> /etc/environment"
sudo sh -c "echo 'hubDeploymentType=${deploymentType}' >> /etc/environment"
sudo sh -c "echo 'portalSetupFlag=true' >> /etc/environment"

printos=`lsb_release -d|awk '{print $2}'`
os=$(echo "$printos" | tr '[:upper:]' '[:lower:]')
echo "$os"
echo "before function ==================="
#downloadFirmware() {
echo "function started"
     curl --location --request GET "https://modus.clouzer.com/firmwares/latestVersion/$os/firmware.properties" > /home/linaro/db/firmware.properties



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
echo "herrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr"
            cat /etc/environment
        cat /home/linaro/db/firmware.properties
        fi
   
        cd $HOME
        #source /etc/environment
   
        MountpointDB=`sudo docker volume inspect db|grep Mountpoint|awk -F : '{ print $2}'|tr -d " \""|tr -d ","`
        MountpointNode=`sudo docker volume inspect node_modules|grep Mountpoint|awk -F : '{ print $2}'|tr -d " \""|tr -d ","`
    echo "sfssfdddfdfd==== $MountpointDB"
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
   
        #project=(soulsystem weeklydb udpserver diagnostic startstandalone)
        #for image in "${project[@]}"
        #do
# echo "after for loop executing ::::::::::::::::"
# echo "$image"
        #sudo docker pull https://modus.clouzer.com:5443/$image:$systemver-$arch-$hubtype-$os-dev
       #sudo docker tag modus.clouzer.com:5443/$image:$systemver-$arch-$hubtype-$os-dev $image
       # sudo docker rmi modus.clouzer.com:5443/$image:$systemver-$arch-$hubtype-$os-dev
        #done
   
        sudo docker pull modus.clouzer.com:5443/soulhub:$hubver-$arch-$hubType-$hubos-dev
        sudo docker tag modus.clouzer.com:5443/soulhub:$hubver-$arch-$hubType-$hubos-dev soulhub
        sudo docker rmi modus.clouzer.com:5443/soulhub:$hubver-$arch-$hubType-$hubos-dev
   
        sudo docker pull modus.clouzer.com:5443/portal:$portalver-$arch-$hubType-$hubos-dev
        sudo docker tag modus.clouzer.com:5443/portal:$portalver-$arch-$hubType-$hubos-dev portal
        sudo docker rmi modus.clouzer.com:5443/portal:$portalver-$arch-$hubType-$hubos-dev
   
        sudo docker pull modus.clouzer.com:5443/pyprocess:$pyver-$arch-$hubType-$hubos-dev
        sudo docker tag modus.clouzer.com:5443/pyprocess:$pyver-$arch-$hubType-$hubos-dev pyprocess
        sudo docker rmi modus.clouzer.com:5443/pyprocess:$pyver-$arch-$hubType-$hubos-dev
   
        sudo docker pull modus.clouzer.com:5443/souldapi:$souldapiver-$arch-$hubType-$hubos-dev
        sudo docker tag modus.clouzer.com:5443/souldapi:$souldapiver-$arch-$hubType-$hubos-dev souldapi
        sudo docker rmi modus.clouzer.com:5443/souldapi:$souldapiver-$arch-$hubType-$hubos-dev
       
        arrayimage=("soulsystem" "weeklydb" "udpserver" "diagnostic" "startstandalone")
echo "in array===================================================================>"
        for image in "${arrayimage[@]}"
        do
echo "========================================================>"
echo $image
        sudo docker pull modus.clouzer.com:5443/$image:$systemver-$arch-$hubtype-$hubos-dev
        sudo docker tag modus.clouzer.com:5443/$image:$systemver-$arch-$hubtype-$hubos-dev $image
        sudo docker rmi modus.clouzer.com:5443/$image:$systemver-$arch-$hubtype-$hubos-dev
        done

        echo "*******************"
        echo "Download sound file"
        url="https://modus.clouzer.com/V2HUB/DOCKER/$hubtype/$hubSubscription/$hubos/sound/$soundver.tar.gz"
        sound_url=$(echo $url | awk '{print tolower($0)}' | sed 's/v2hub/V2HUB/g; s/docker/DOCKER/g; s/prod/PROD/g; s/basic/BASIC/g; s/debian/DEBIAN/g; s/ubuntu/UBUNTU/g; s/sound/SOUND/g')
        echo $sound_url
        echo '::::::::::::::::::::::::::::::::::::::'
        wget -O sounds.tar.gz $sound_url
        tar -xf /home/linaro/sounds.tar.gz -C /var/lib/docker/volumes/sounds/_data
        echo "sound file is extracted successfully"
#}

echo "calling funciton"
sudo crontab -r
echo -e "@reboot /home/linaro/Docker_scripts/soulScripts/Start_dockerContainer.sh > /home/linaro/container_process.log 2>&1" > $HOME/docker_root_crontab
echo -e "00 00 * * 7 /home/linaro/DockerV2/weeklydb.sh > /home/linaro/DockerV2/weeklydb.log 2>&1" >> $HOME/docker_root_crontab
echo -e "*/10 * * * * /home/linaro/Docker_scripts/soulScripts/processMonitor.sh >> /home/linaro/logs/core/processMonitor.log 2>&1" >> $HOME/docker_root_crontab
echo -e "*/5 * * * * /home/linaro/Docker_scripts/soulScripts/DockerStatus.sh >> /home/linaro/logs/core/DockerStatus.log 2>&1" >> $HOME/docker_root_crontab
echo -e "0 0 * * * /home/linaro/Docker_scripts/soulScripts/logRotate.sh" >> $HOME/docker_root_crontab
echo -e "0 0 1 * * docker system prune -f > /home/linaro/docker_prune.log" >> $HOME/docker_root_crontab
cat $HOME/docker_root_crontab | sudo crontab -
sudo reboot
#echo "Now download Firmware"
#downloadFirmware
