#!/bin/bash
source /home/linaro/SoulSystem/lib/soulConfig/user_profile
source /etc/environment
LinuxArch=$(uname -m )

if [ $LinuxArch == 'armv7l' ] ; then
    export PATH=$HOME/node-v10.1.0-linux-armv7l/bin:$PATH
else
    export PATH=$HOME/node-v10.1.0-linux-arm64/bin:$PATH
fi

HUB_PATH="/soulHub"
CODE_PATH="$HOME/$HUB_PATH"
cd "$CODE_PATH"
HubVer="V2"
HubType=$HUB_TYPE
HubSub=$HubSub
SERVER=`cat "$HOME"/db/server`
cd
# in case if no firmware.properties file is present
if [ ! -f /home/linaro/db/firmware.properties ]
then
    echo "File not found!"
    touch /home/linaro/db/firmware.properties
    echo "[firmware]" >> /home/linaro/db/firmware.properties
    echo "dependency=0.0.0" >> /home/linaro/db/firmware.properties
    echo "module=0.0.0" >> /home/linaro/db/firmware.properties
    echo "sound=0.0.0" >> /home/linaro/db/firmware.properties
    echo "soulHub=0.0.0" >> /home/linaro/db/firmware.properties
    echo "portal=0.0.0" >> /home/linaro/db/firmware.properties
    echo "SoulSystem=0.0.0" >> /home/linaro/db/firmware.properties
fi

dirCheck()
{
    if [ -d "$directory" ]
    then
        echo "$directory found"
        sudo chown linaro:linaro $directory
        case $directory in
            db)
                echo "*** Reading value from db folder for server"
                SERVER=`cat "$HOME"/db/server`
                ;;
            logs)
                 echo "***** Logs directory is present"
                ;;
            portal)
                echo "***** Portal directory is present"
                ;;
            node_modules)
                echo "***** Node modules are present No further action required"    
                ;;
            sensorjson)
                echo "***** sensor_json directory present No further action required"   
                ;;
            .npm)
                echo "***** .npm directory exists... No further action required"
                ;;
            dbBackup)
                echo "***** dbBackup directory exists... No further action required"
                ;;
            SoulSystem)
                echo "***** SoulSystem directory exists... No further action required" 
                ;;
            *)
                echo "***** No specific action required for $directory"
                ;;
        esac
    else
        echo "$directory not found"
        sudo mkdir -p "$directory"
        sudo chown linaro:linaro "$directory"
        echo "$directory is created"
        case $directory in
            db)
                echo "No db folder is present"
                cd /home/linaro/db/
                sudo truncate -s 0 server

                if [ HubType == "alpha" ]
                then
                    echo "https://dev.clouzer.com" >> server   ####Change this too 
                else
                    echo "https://test.clouzer.com" >> server    ####Change this too 
                fi

                cd
                ;;
            logs)
                echo "Logs folder created..."
                ;;
            portal)
                echo "****** Extracting portal directory"
                sudo rm portal.tar.gz*
                portalver=`cat db/firmware.properties|grep ^portal|awk '{print $3}'`
                ###Change as per OS ###          
                wget -O modules.tar.gz $SERVER/V2HUB/`echo $HUBTYPE | tr '[:lower:]' '[:upper:]'`/$HubVer/LINUX/MODULE/`echo $portalver|awk -F '-' '{print $1}'`/$portalver.tar.gz
                sudo chown linaro:linaro portal.tar.gz
                cd /home/linaro/portal && tar -xf ../portal.tar.gz
                ;;
            .npm)
                echo ".npm directory"
                ;;
            node_modules)
                echo "***************Node modules to be extracted **************"
                sudo rm modules.tar.gz*
                modulever=`cat db/firmware.properties|grep ^module|awk '{print $3}'`      
                ###Change as per OS ###          
                wget -O modules.tar.gz $SERVER/V2HUB/`echo $HUBTYPE | tr '[:lower:]' '[:upper:]'`/$HubVer/LINUX/MODULE/`echo $modulever|awk -F '-' '{print $1}'`/$modulever.tar.gz
                sudo chown linaro:linaro modules.tar.gz
                tar -xf modules.tar.gz
                ;;
            sounds)
                echo "******sounds to be extracted ***************"
                sudo rm sounds.tar.gz*
                soundver=`cat db/firmware.properties|grep ^sound|awk '{print $3}'`
                ###Change as per OS ###          
                wget -O sounds.tar.gz $SERVER/V2HUB/`echo $HUBTYPE | tr '[:lower:]' '[:upper:]'`/$HubVer/LINUX/MODULE/`echo $soundver|awk -F '-' '{print $1}'`/$soundver.tar.gz
                sudo chown linaro:linaro sounds.tar.gz
                tar -xf sounds.tar.gz
                ;;
            sensorjson)
                echo "******** sensorjson directory created"
                ;;
            roomjson)
                echo "******** roomjson directory created"
                ;;
            dbBackup)
                echo  "******** dbBackup directory created"
                ;;
            SoulSystem)
                echo "****** SoulSystem created"
                sudo rm SoulSystem.tar.gz*
                systemver=`cat db/firmware.properties|grep ^SoulSystem|awk '{print $3}'`
                ###Change as per OS ###          
                wget -O sounds.tar.gz $SERVER/V2HUB/`echo $HUBTYPE | tr '[:lower:]' '[:upper:]'`/$HubVer/LINUX/MODULE/`echo $systemver|awk -F '-' '{print $1}'`/$systemver.tar.gz
                sudo chown linaro:linaro SoulSystem.tar.gz
                cd /home/linaro/SoulSystem && tar -xf ../SoulSystem.tar.gz && cd /home/linaro
                # Reboot the  Soulhub and initiate cronjob too
                echo '{action:run_hub-run_hub-sudo reboot-hub,Path:'`pwd`',Timestamp:'`date`',User:'`whoami`'}' >> /home/linaro/logs/core/reboot.log
                sleep 5 && sudo reboot
                ;;  
            *)
                echo "Sorry, something is missing and that is $directory"
                ;;
        esac
    fi
}

#Directory Check
echo "***** Directory validation started ******"
dirList=( logs db portal sounds node_modules .npm sensorjson roomjson dbBackup SoulSystem)

for directory in "${dirList[@]}"
do
dirCheck $directory
done


# Check if start process already exists? if exists kill the process.
echo "----------------------------------------------------------------------------------------------------"
echo "killing start.js"
gpid_start=`ps -ax -o "%p %P %r %a"|grep -w "node lib/start.js"|grep -v grep|awk '{print $3}'`
echo $gpid_start
kill -2 -$gpid_start
sleep 5
ps -ax | grep "node lib/start.js"|grep -v grep
if [ $? -eq 0 ]
then
   echo "process was not killed, killing again"
   kill -2 -$gpid_start
   sleep 5
else 
   echo "Successfully killed start.js"
fi

# Kill the mosquttio process
echo "----------------------------------------------------------------------------------------------------"
echo "Kill the mosquttio process"
ps -ax | grep "mosquitto" | awk '{print $1}' | sudo xargs kill -2


echo "----------------------------------------------------------------------------------------------------"
echo "Starting soulsystem Process systemStart.js standAlone"
cd /home/linaro/SoulSystem/lib/soulProcesses
node systemStart.js > /dev/null 2>&1 &
sleep 10

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=1
echo "----------------------------------------------------------------------------------------------------"



# Checks if email file exists?
if [ -f /home/linaro/db/email ];then
    echo "Email File exists"
else
    echo "Email File does not exists, Adding default email"
    echo "soul-support@nciportal.com">>  /home/linaro/db/email
fi

# Checks if server file exists?
if [ -f /home/linaro/db/server ];then
    echo "Server File exists"
else
    echo "Server File does not exists, Adding default server"
    if [ HubType == "alpha" ]
    then
    echo "https://dev.clouzer.com" >> server  #Change this too Server url 
    else
    echo "https://test.clouzer.com" >> server #Change this too  Server url
    fi
fi

# Checks if serial file exists, if exists remove serial
if [ -f /home/linaro/db/serial ];then
    sudo rm -rf /home/linaro/db/serial
else
    echo "Serial File does not exists, Now Checking if link exists"
fi

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=5
echo "----------------------------------------------------------------------------------------------------"

# Check if link exists? if doesnt exists create link 
if [ -L /home/linaro/db/serial ];then
    echo "Link of serial exists"
else
    echo "Serial Link doesnt exists Creating link for Serial"
fi
cd /home/linaro/db
    sudo chmod 444 /etc/hostname
    sudo chown linaro:linaro /etc/hostname
    sudo ln -s /etc/hostname serial

# Check if SoulSystem Service exists
if [ -L /etc/systemd/system/Darwin.service ];then
	echo "Darwin.service link exists"
else
	echo "Darwin Service link doesnt exists"
	cd /etc/systemd/system
	sudo ln -s /home/linaro/SoulSystem/lib/soulConfig/Darwin.service Darwin.service
	sleep 5s
	sudo chown linaro:linaro Darwin.service
	sudo systemctl enable Darwin.service
fi

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=10
echo "----------------------------------------------------------------------------------------------------"

# Checks if mesh file exists, if doesn't exist touch file
if [ -f /home/linaro/db/mesh ];then
    echo "Mesh File Exists"
else
    echo "Mesh file doesn't exist : creating file"
    touch /home/linaro/db/mesh
fi

# Checks if statusMap file exists, if doesn't exist statusMap file
if [ -f /home/linaro/db/statusMap.json ];then
    echo "statusMap File Exists"
else
    echo "statusMap file doesn't exist : creating file"
    touch /home/linaro/db/statusMap.json
fi

# checks if DarwinSystem Dir is empty
if [ -z "$(ls -A /home/linaro/SoulSystem)" ]; then
    echo "Empty"
    sudo rm SoulSystem.tar.gz*
    systemver=`cat db/firmware.properties|grep ^SoulSystem|awk '{print $3}'`
    ###Change as per OS ###          
    wget -O sounds.tar.gz $SERVER/V2HUB/`echo $HUBTYPE | tr '[:lower:]' '[:upper:]'`/$HubVer/LINUX/MODULE/`echo $systemver|awk -F '-' '{print $1}'`/$systemver.tar.gz
    sudo chown linaro:linaro SoulSystem.tar.gz
    cd /home/linaro/SoulSystem && tar -xf ../SoulSystem.tar.gz && cd /home/linaro
    echo '{action:run_hub-DarwinSystem-sudo reboot-hub,Path:'`pwd`',Timestamp:'`date`',User:'`whoami`'}' >> /home/linaro/logs/core/reboot.log
    sudo reboot

else
   echo "Not Empty"
fi

# Remove subdirectories in Logs directories.
cd /home/linaro/logs
LOGSNUMBER=$(find -type d |wc -l)
if [ "$LOGSNUMBER" -gt 1 ]; then
	echo directories present
	echo removing directories from logs directory
	find -mindepth 1 -maxdepth 1 -type d -exec rm -r {} \;
else
	echo logs directory does not have any subdirectories
fi

# Setting up Permission.sh for setting default permission for shell scripts.
if [ -f /home/linaro/permission.sh ]; then
	echo "bash shell script exists"
    sudo rm -rf /home/linaro/permission.sh
fi
if [ -L /home/linaro/permission.sh ]; then
    echo "Link of PERMISSION.sh exists"
else
	echo "doesnt exists"
	sudo ln -s /home/linaro/SoulSystem/lib/soulScripts/permission.sh /home/linaro/permission.sh
	/home/linaro/permission.sh
fi
sudo chown linaro:linaro /home/linaro/permission.sh
sudo chmod 777 /home/linaro/permission.sh

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=20
echo "----------------------------------------------------------------------------------------------------"


# Setting up root crontab
ROOTCRONTAB=$(sudo crontab -l | wc -l)
echo root crontab lines $ROOTCRONTAB
if [ $ROOTCRONTAB -ne 4 ]; then
	echo "not eq"
	cat /home/linaro/SoulSystem/lib/soulConfig/root_crontab | sudo crontab -
    
else
	echo "eq no action required"
fi

# Create soft link of sounds directory
soundsdirectory="sounds"
if [ -d "$soundsdirectory" ]
then
    echo "$soundsdirectory found -> $?"
    ln -s /home/linaro/sounds /home/linaro/soulHub/
fi

# Remove voiceKit directory if exists
voiceKitdirectory="voiceKit"
if [ -d "$voiceKitdirectory" ]
then
    echo "$soundsdirectory found -> $?"
    cd /home/linaro/ && sudo rm -rf voiceKit voiceKit.tar.gz
fi

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=30
echo "----------------------------------------------------------------------------------------------------"


# Copy Error pages if not found
cd /usr/share/nginx/html/
if [[ -f 500error.html && -f 404error.html ]]
then
    echo "Error file exist"
else
    cd /home/linaro/SoulSystem/lib/soulConfig/ && sudo cp 500error.html 404error.html /usr/share/nginx/html/.
    echo "File does not exist"
fi

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=35
echo "----------------------------------------------------------------------------------------------------"


# Setting up user crontab
echo "Setting up user crontab"
CRON="$(crontab -l | wc | awk '{print $3}')"
echo "$CRON"
if [ "$CRON" -ne 463 ]
then
    echo "replacing crontab file..."
    cat /home/linaro/SoulSystem/lib/soulConfig/user_crontab | crontab - # user
else
    echo "Cron Job is present..."
fi

# Checking logrotate package if exists good to go else install
if dpkg-query -s 'logrotate' 1>/dev/null 2>&1; 
then
	printf "no needs installation logrotate"
else
	printf "logrotate Package need to installation"
	sudo apt-get install logrotate 
fi
[ -f /etc/logrotate.conf ] && echo "logrotate.conf File exist" || sudo cp ~/SoulSystem/lib/soulConfig/logrotate.conf /etc/

if dpkg-query -s 'mosquitto' 1>/dev/null 2>&1; 
then
	printf "no needs installation logrotate"
else
	printf "logrotate Package need to mosquitto"
	sudo apt-get install -y mosquitto
fi

if dpkg-query -s 'mosquitto-client' 1>/dev/null 2>&1; 
then
	printf "no needs installation mosquitto-client"
else
	printf "mosquitto-client Package need "
	sudo apt-get install -y mosquitto-client
fi

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=40
echo "----------------------------------------------------------------------------------------------------"

if dpkg-query -s 'sshpass' 1>/dev/null 2>&1; 
then
	printf "no needs installation sshpass"
else
	printf "sshpass Package need "
    sudo apt-get install sshpass -y
fi

if dpkg-query -s 'libavahi-compat-libdnssd-dev' 1>/dev/null 2>&1;
then
    printf "no needs installation libavahi-compat-libdnssd-dev"
else
    sudo apt-get install -y libavahi-compat-libdnssd-dev
fi

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=45
echo "----------------------------------------------------------------------------------------------------"

# Check nginx file
LINES=$(wc -l /etc/nginx/sites-enabled/default | cut -d " " -f 1)
echo "Number of lines in NGINX code"
echo $LINES
if [[ $LINES -lt 44 ]]
then
    echo "updating NGINX code..."
    sudo cp ~/SoulSystem/lib/soulConfig/nginx.conf /etc/nginx/sites-enabled/default
    sudo /etc/init.d/nginx reload
else
    echo "No change required in NGINX"
fi

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=50
echo "----------------------------------------------------------------------------------------------------"

echo "========================="
echo "Updating dependancy files"
echo "========================="

######### Add here for the Dependacy for the lifx sonos  as well as lokijs democracy

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=55
echo "----------------------------------------------------------------------------------------------------"

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=60
echo "----------------------------------------------------------------------------------------------------"

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=70
echo "----------------------------------------------------------------------------------------------------"

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=80
echo "----------------------------------------------------------------------------------------------------"


echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=85
echo "----------------------------------------------------------------------------------------------------"


a=`who -r|awk '{print $2}'`
if [ $a -ne 3 ];
then
    sudo systemctl set-default multi-user.target
fi

# Starting up the mqtt
echo "starting mqtt"
#  check for the starting mosquitto before it getting start thorugh run -hub 
echo "Setting up mosquitto"
sudo cp  ~/SoulSystem/lib/soulConfig/mosquitto.conf /etc/mosquitto/mosquitto.conf
sudo service mosquitto restart


# Change Password of if condition satisfies
echo -e "darwinismNcpl\nD@|\w!nOfqcm410\nD@|\w!nOfqcm410" | passwd
if [ $? -ne 0 ];then
   echo "No need to change password"
else
   echo "password change done successfully"
fi

echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=90
echo "----------------------------------------------------------------------------------------------------"

# Starting up the mqtt
echo "starting mqtt"
#  check for the starting mosquitto before it getting start thorugh run -hub 
echo "Setting up mosquitto"
sudo cp ~/SoulSystem/lib/soulConfig/mosquitto.conf /etc/mosquitto/mosquitto.conf
sudo service mosquitto restart

##########Add here for the Daignostic portal in V2

cd
sudo systemctl start ssh

echo "=================="
echo "Starting Processes"
echo "=================="

SwapFile=$(cat /proc/meminfo | grep SwapTotal | awk '{print $2}')
if [ $SwapFile == 0 ];then

	#create file
    echo 'create file'
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    cd /home/linaro/SoulSystem/lib/soulScripts/ && sudo cp swapfile /etc/fstab
    sudo swapon /swapfile
    
fi

cd
echo "----------------------------------------------------------------------------------------------------"
curl 0.0.0.0:4001/process?percent=95
echo "----------------------------------------------------------------------------------------------------"

# Starting up the process
echo "starting start.js"
cd /home/linaro/soulHub/
sleep 30
node lib/start.js > /dev/null 2>&1 &
echo "================="
echo "DONE WITH SOUL HUB PROCESS"
echo "================="
echo 'start_soul_hub process end :'`date`