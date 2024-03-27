#!/bin/bash

#####Script to verify V2 hub setup#############

serviceCheck()
{
	dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`
	case $service in
            docker)
		echo "$dat   Checking docker service status"
		ps -aef|grep -w /usr/bin/dockerd|grep -v grep
		if [ $? -ne 0 ];then
			echo "$dat   Docker daemon has stopped need to start it"
			sudo /etc/init.d/docker start 
		fi
                ;;
            mosquitto)
		echo "$dat   Checking mosquitto service status"
		ps -aef|grep mosquitto && netstat -tunpl|grep 8886
		if [ $? -ne 0 ];then
			echo "$dat   mosquitto service has stopped need to start it"
			sudo systemctl start mosquitto
		fi
                ;;
            ssh)
		echo "$dat   Checking sshd service status"
		ps -aef|grep /usr/sbin/sshd
		if [ $? -ne 0 ];then
			echo "$dat   mosquitto service has stopped need to start it"
			sudo systemctl start ssh
		fi
		;;
	esac
}


dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`
echo $dat
export a=0

#1> Check mqtt authkey in environment file

cat /etc/environment|grep mqtt_authkey
if [ $? -ne 0 ]
then
    echo -e "$dat:   No entry for mqtt_authkey.. create new mqt_authkey\n"
    sudo -u root bash -c "echo -e "mqtt_authkey=`cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16`" >> /etc/environment"
fi

#2> Check required volume and its link present or not

volList=(db node_modules Docker_scripts logs sounds localassets)

for volume in ${volList[@]}
do
    echo $volume
    sudo docker volume ls|grep $volume
    if [ $? -eq 0 ]
    then
        echo "$dat:   $volume found"
        cd /home/linaro
        if [ -L $volume ];then echo -e "link present\n"; else ln -s /var/lib/docker/volumes/$volume/_data /home/linaro/$volume && chown -R linaro:linaro /home/linaro/$volume; fi
    else
        echo -e "$dat:   $volume not found\n"
        sudo docker volume create "$volume"
        sudo chown -R linaro:linaro /var/lib/docker
        sudo chmod -R 777 /var/lib/docker
        echo "$dat:   $volume volume is created"

    fi
done

#3> Check systemAction 
if [ -f /home/linaro/systemActions.js ];then
	echo "$dat:   systemActions file present @ HOME location"
	Updated_file="/home/linaro/Docker_scripts/soulScripts/systemActions.js"
	System_file="/home/linaro/systemActions.js"
	echo -e "$dat:   Checking update for systemActions conf file\n"
	diff $Updated_file $System_file > /dev/null 2>&1
	if [ $? -ne 0 ]
	then
		echo -e "$dat:   Not equal....updating systemaction file\n"
		sudo cp /home/linaro/Docker_scripts/soulScripts/systemActions.js /home/linaro/systemActions.js
		echo "$dat:   systemActions.js file updated" >> /home/linaro/logs/core/reboot.log
        a=`expr $a + 1`
	else
		echo -e "$dat:   No need to update systemaction file\n"
 	fi
else
	echo "$dat:   file systemActions.js not present copying from Docker_scripts"
	sudo cp /home/linaro/Docker_scripts/soulScripts/systemActions.js /home/linaro/systemActions.js
	echo "$dat:   systemActions.js file not present now copied" >> /home/linaro/logs/core/reboot.log
	a=`expr $a + 1`	
fi

#4> Check dockerProcessMonitor.js 
	if [ -f /home/linaro/dockerProcessMonitor.js ];then
	echo "$dat   dockerProcessMonitor file present @ HOME location"
	Updated_file="/home/linaro/Docker_scripts/soulScripts/dockerProcessMonitor.js"
	System_file="/home/linaro/dockerProcessMonitor.js"
	echo -e "$dat:   Checking update for dockerProcessMonitor conf file\n"
	diff $Updated_file $System_file > /dev/null 2>&1
	if [ $? -ne 0 ]
	then
		echo -e "$dat:   Not equal.......updating dockerProcessMonitor file\n"
		sudo cp /home/linaro/Docker_scripts/soulScripts/dockerProcessMonitor.js /home/linaro/dockerProcessMonitor.js
		a=`expr $a + 1`
	else
		echo -e "$dat:   No need to update dockerProcessMonitor file\n"
	fi
else
	echo -e "$dat:   file dockerProcessMonitor.js not present copying from Docker_scripts\n"
	sudo cp /home/linaro/Docker_scripts/soulScripts/dockerProcessMonitor.js /home/linaro/dockerProcessMonitor.js
	a=`expr $a + 1`
fi

#5> Check serverShh.js 
	if [ -f /home/linaro/serverShh.js ];then
	echo "$dat:   serverShh.js file present @ HOME location"
	Updated_file="/home/linaro/Docker_scripts/soulScripts/serverShh.js"
	System_file="/home/linaro/serverShh.js"
	echo -e "$dat:   Checking update for serverShh conf file\n"
	diff $Updated_file $System_file > /dev/null 2>&1
	if [ $? -ne 0 ]
	then
		echo -e "$dat:   Not equal.......updating serverShh file\n"
		sudo cp /home/linaro/Docker_scripts/soulScripts/serverShh.js /home/linaro/serverShh.js
	else
		echo -e "$dat:   No need to update serverShh file\n"
	fi
else
	echo -e "$dat:   file serverShh.js not present copying from Docker_scripts\n"
	sudo cp /home/linaro/Docker_scripts/soulScripts/serverShh.js /home/linaro/serverShh.js
fi

#6> Check module-checker.js
        if [ -f /home/linaro/module-checker.js ];then
        echo "$dat:   module-checker.js file present @ HOME location"
        Updated_file="/home/linaro/Docker_scripts/soulScripts/module-checker.js"
        System_file="/home/linaro/module-checker.js"
        echo -e "$dat   Checking update for  System file\n"
        diff $Updated_file $System_file > /dev/null 2>&1
        if [ $? -ne 0 ]
        then
                echo -e "$dat:   Not equal.......updating module-checker file\n"
                sudo cp /home/linaro/Docker_scripts/soulScripts/module-checker.js /home/linaro/module-checker.js
				a=`expr $a + 1`
        else
                echo -e "$dat:   No need to update module-checker.js file\n"
        fi
else
        echo -e "$dat:   file module-checker.js not present copying from Docker_scripts\n"
        sudo cp /home/linaro/Docker_scripts/soulScripts/module-checker.js /home/linaro/module-checker.js
		a=`expr $a + 1`
fi

#6> Check module-checker.sh

if [ -f /home/linaro/module-checker.sh ];then
        echo "$dat:   module-checker.sh file present @ HOME location"
        Updated_file="/home/linaro/Docker_scripts/soulScripts/module-checker.sh"
        System_file="/home/linaro/module-checker.sh"
        echo -e "$dat:   Checking update for  System file\n"
        diff $Updated_file $System_file > /dev/null 2>&1
        if [ $? -ne 0 ]
        then
                echo -e "$dat:   Not equal.......updating module-checker file\n"
                sudo cp /home/linaro/Docker_scripts/soulScripts/module-checker.sh /home/linaro/module-checker.sh
				a=`expr $a + 1`
        else
                echo -e "$dat:   No need to update module-checker.js file\n"
        fi
else
        echo -e "$dat:   file module-checker.sh not present copying from Docker_scripts\n"
        sudo cp /home/linaro/Docker_scripts/soulScripts/module-checker.sh /home/linaro/module-checker.sh
		a=`expr $a + 1`
fi

#7> Setting up root crontab
sudo crontab -l|grep Docker_scripts
if [ $? -eq 0 ];then
	echo "$dat:   Crontab file is latest one"
	original_count=$(cat /home/linaro/Docker_scripts/soulConfig/docker_root_crontab |wc -w)
	ROOTCRONTAB=$(sudo crontab -l | wc -w)
	echo -e "$dat:   root crontab lines $ROOTCRONTAB\n"
	if [ $ROOTCRONTAB -ne $original_count ]; then
		echo -e "$dat:   not equal...updating cronjob file\n"
		cat /home/linaro/Docker_scripts/soulConfig/docker_root_crontab | sudo crontab -
	#	rm -rf /home/linaro/DockerV2
	        echo "$dat:   Updatating root crontab" >> /home/linaro/logs/core/reboot.log
		a=`expr $a + 1`
	fi
else
	echo -e "$dat:   Updating cronjob with latest crontab file\n"
	cat /home/linaro/Docker_scripts/soulConfig/docker_root_crontab | sudo crontab -
	#rm -rf /home/linaro/DockerV2
	echo "$dat:   Updating latest crontab" >> /home/linaro/logs/core/reboot.log
	a=`expr $a + 1`

fi

#8> Setting up user crontab
crontab -lu linaro
if [ $? -eq 0 ];then
	echo "$dat   Crontab file is latest one"
	original_count=$(cat /home/linaro/Docker_scripts/soulConfig/docker_user_crontab |wc -w)
	USERCRONTAB=$(crontab -lu linaro | wc -w)
	echo -e "$dat:   user crontab lines $USERCRONTAB\n"
	if [ $USERCRONTAB -ne $original_count ]; then
		echo -e "$dat   not equal...updating cronjob file\n"
		cat /home/linaro/Docker_scripts/soulConfig/docker_user_crontab | crontab -u linaro -
	        echo "$dat:   Updatating user crontab" >> /home/linaro/logs/core/reboot.log
	    a=`expr $a + 1`
	fi
else
	echo -e "$dat:   Updating cronjob with latest crontab file\n"
	cat /home/linaro/Docker_scripts/soulConfig/docker_user_crontab | crontab -u linaro -
	#rm -rf /home/linaro/DockerV2
	echo "$dat:  Updating latest user crontab " >> /home/linaro/logs/core/reboot.log
    a=`expr $a + 1`
fi


#9> Check service status

serviceList=( docker mosquitto ssh )

for service in "${serviceList[@]}"
do
serviceCheck $service
done

cat /home/linaro/Docker_scripts/soulScripts/Start_dockerContainer.sh|grep ^node
if [ $? -eq 0 ]
then
	arch=`dpkg --print-architecture`
	echo $arch
	if [ $arch == 'arm64' ];then
		echo -e "$dat:   Updating node parameter in Start_dockerContainer.sh for $arch\n"
		sed -i 's@^node@~linaro/node-v10.1.0-linux-arm64/bin/node@' /home/linaro/Docker_scripts/soulScripts/Start_dockerContainer.sh
		echo "$dat:   Updating node parameter in Start_dockerContainer.sh " >> /home/linaro/logs/core/reboot.log
	    a=`expr $a + 1`
	elif [ $arch == 'amd64' ];then
		echo -e "$dat:   Updating node parameter in Start_dockerContainer.sh for $arch\n"
		sed -i 's@^node@~linaro/node-v10.1.0-linux-x64/bin/node@' /home/linaro/Docker_scripts/soulScripts/Start_dockerContainer.sh
		echo "$dat:   Updating node parameter in Start_dockerContainer.sh " >> /home/linaro/logs/core/reboot.log
	    a=`expr $a + 1`
	fi
fi

#10> Check for installed packages

PackageList=( logrotate bluez network-manager sshpass net-tools cron )

for package in "${PackageList[@]}"
do
	if dpkg-query -s ${package} > /dev/null 2>&1; 
	then
		echo -e "$dat:   no need installation for ${package}\n"
	else
		echo -e "$dat:   ${package} Package need to install\n"
		sudo apt-get install ${package} 
		if [ ${package} == 'logrotate' ];then
			sudo cp /home/linaro/Docker_scripts/soulConfig/docker_logrotate.conf /etc/logrotate.conf
		fi
	fi
done

##mosquitto
RELEASE=`cat /etc/os-release |head -n 1 |cut -d "=" -f2|tr -d '"'|cut -d " " -f1`
echo "$RELEASE"
if [ $RELEASE == "Ubuntu" ];then
 if dpkg-query -s 'mosquitto' 1>/dev/null 2>&1;
 then
        printf "cheking mosquitto version \n"
	Version=`dpkg -s mosquitto |grep Version |tr -s " " |cut -d ":" -f 2|cut -d "-" -f1`
	Version1="${Version//[[:space:]]/}"
	Version2="2.0.0"
        echo "$Version1"
	echo "$Version2"
	if { echo "$Version1"; echo "$Version2"; } | sort --version-sort --check; then
        echo "Version lower than 2.0.0, Purging the mosquitto"
        sudo apt-get purge mosquitto -y
        sudo apt-get purge mosquitto-clients -y
	sudo rm -rf /etc/mosquitto/mosquitto.conf
	sudo dpkg --configure -a
	echo "Now installing new mosquitto Version"
        sudo apt-add-repository ppa:mosquitto-dev/mosquitto-ppa -y
        sudo apt-get update
        sudo apt-get install mosquitto -y
        sudo apt-get install mosquitto-clients -y
	sudo sed -i s@"ExecStartPre=/bin/mkdir -m 740 -p /run/mosquitto"@"ExecStartPre=/bin/mkdir -m 740 -p /var/run/mosquitto"@g /lib/systemd/system/mosquitto.service
        sudo sed -i s@"ExecStartPre=/bin/chown mosquitto /run/mosquitto"@"ExecStartPre=/bin/chown mosquitto: /var/run/mosquitto"@g /lib/systemd/system/mosquitto.service
        sudo systemctl daemon-reload
	sudo iptables -t nat -I PREROUTING -p tcp --dport 1883 -j REDIRECT --to-port 8886
        sudo systemctl restart mosquitto.service
        else
        echo "no need to install mosquitto"
        fi
 else
        echo "mosquitto not present,need to install mosquitto"
        sudo apt-add-repository ppa:mosquitto-dev/mosquitto-ppa -y
        sudo apt-get update
        sudo apt-get install -y mosquitto
        sudo apt-get install mosquitto-clients -y
	sudo sed -i s@"ExecStartPre=/bin/mkdir -m 740 -p /run/mosquitto"@"ExecStartPre=/bin/mkdir -m 740 -p /var/run/mosquitto"@g /lib/systemd/system/mosquitto.service
        sudo sed -i s@"ExecStartPre=/bin/chown mosquitto /run/mosquitto"@"ExecStartPre=/bin/chown mosquitto: /var/run/mosquitto"@g /lib/systemd/system/mosquitto.service
        sudo systemctl daemon-reload
	sudo iptables -t nat -I PREROUTING -p tcp --dport 1883 -j REDIRECT --to-port 8886
        sudo systemctl restart mosquitto.service
 fi
fi

#11> Check logrotate conf
Updated_file="/home/linaro/Docker_scripts/soulConfig/docker_logrotate.conf"
System_file="/etc/logrotate.conf"
echo "$dat:   Checking update for logrotate conf file"
diff $Updated_file $System_file > /dev/null 2>&1
if [ $? -ne 0 ]
then
	echo -e "$dat:   Not equal.......updating logrotate conf file\n"
	sudo cp /home/linaro/Docker_scripts/soulConfig/docker_logrotate.conf /etc/logrotate.conf
else
	echo -e "$dat:   logrotate conf file is updated one\n"
fi

#12> Check mosquitto conf
Updated_file="/home/linaro/Docker_scripts/soulConfig/docker_mosquitto.conf"
System_file="/etc/mosquitto/mosquitto.conf"
echo "$dat   Checking update for mosquitto conf file"
diff $Updated_file $System_file > /dev/null 2>&1
if [ $? -ne 0 ]
then
	echo -e "$dat:   Not equal.........updating mosquitto conf file\n"
	sudo cp /home/linaro/Docker_scripts/soulConfig/docker_mosquitto.conf /etc/mosquitto/mosquitto.conf
else
	echo -e "$dat:   mosquitto conf file is updated one\n"
fi

dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`
#13> check iptable rule

sudo iptables -L -n -t nat|grep "tcp dpt:1883 redir ports 8886"
if [ $? -ne 0 ]
then
	echo -e "$dat:   Iptable rule not present...Adding it\n"
	sudo iptables -t nat -I PREROUTING -p tcp --dport 1883 -j REDIRECT --to-port 8886
else
	echo -e "$dat:   Updated iptable rule\n"
fi

#12> Check mosquitto conf
Updated_file="/home/linaro/Docker_scripts/soulConfig/mosquitto_sensor.conf"
System_file="/etc/mosquitto/mosquitto_sensor.conf"
echo "$dat   Checking update for sensor mosquitto conf file"
diff $Updated_file $System_file > /dev/null 2>&1
if [ $? -ne 0 ]
then
	echo -e "$dat:   Not equal.........updating sensor mosquitto conf file\n"
	sudo cp /home/linaro/Docker_scripts/soulConfig/mosquitto_sensor.conf /etc/mosquitto/mosquitto_sensor.conf
else
	echo -e "$dat: sensor mosquitto conf file is updated one\n"
fi

dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`
#13> check iptable rule

sudo iptables -L -n -t nat|grep "tcp dpt:1883 redir ports 8884"
if [ $? -ne 0 ]
then
	echo -e "$dat:   Iptable rule not present...Adding it\n"
	sudo iptables -t nat -I PREROUTING -p tcp --dport 1883 -j REDIRECT --to-port 8884
else
	echo -e "$dat:   Updated iptable rule\n"
fi

#15> Check for hubKeyVal and systemToken files
echo "$dat:   Checking for hubKeyVal and systemToken files...."
for i in hubKeyVal systemToken
do
if [ ! -f /home/linaro/db/$i ];then
	echo "$dat   Creating $i file"
	touch /home/linaro/db/$i
	chown linaro:linaro /home/linaro/db/$i
fi
done

#15> Check for weeklydbSchedule file
echo "$dat:   Checking for weeklydbSchedule file...."
if [ ! -f /home/linaro/db/weeklydbSchedule ];then
	echo "$dat   Creating weeklydbSchedule file"
	echo "00 00 * * 7" >> /home/linaro/db/weeklydbSchedule
	chmod 777 /home/linaro/db/weeklydbSchedule
	chown linaro:linaro /home/linaro/db/weeklydbSchedule
fi

if [ ! -f /home/linaro/db/timeZone ];then
	echo "$dat:   Creating timeZone file"
	echo "Asia/Calcutta" >> /home/linaro/db/timeZone
	chmod 777 /home/linaro/db/timeZone
	chown linaro:linaro /home/linaro/db/timeZone
fi


#17> Check for swap parition
echo "$dat:  Checking for swap partition"

if [ -f /home/linaro/Docker_scripts/soulScripts/swapfile ]
then
    SwapFile=$(cat /proc/meminfo | grep SwapTotal | awk '{print $2}')
    if [ $SwapFile == 0 ];then

        echo "$dat   create file"
        sudo fallocate -l 1.5G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        cd /home/linaro/Docker_scripts/soulScripts && sudo -u root bash -c "cat swapfile >> /etc/fstab"
        sudo swapon /swapfile
    fi
fi

#18> Update serial entry in hosts file

serial=`cat /home/linaro/db/serial`
echo $serial
grep -wi $serial /etc/hosts
if [ $? -ne 0 ];then
    echo "$dat:   Updating serial entry in hosts file"
    echo -e "127.0.0.1\t$serial" >> /etc/hosts
    tail -1 /etc/hosts
else
    echo "$dat:   No need update hosts file"
fi

echo "***********************************************************************************"

#19> Check driverProcessor
if [ -f /home/linaro/driverProcessor.js -a -f /home/linaro/Docker_scripts/soulDapi/driverProcessor.js ];then
        echo "$dat:   driverProcessor file present @ HOME location"
        Updated_file="/home/linaro/Docker_scripts/soulDapi/driverProcessor.js"
        System_file="/home/linaro/driverProcessor.js"
        echo -e "$dat:   Checking update for driverProcessor conf file\n"
        diff $Updated_file $System_file > /dev/null 2>&1
        if [ $? -ne 0 ]
        then
                echo -e "$dat:   Not equal....updating driverProcessor file\n"
                sudo cp /home/linaro/Docker_scripts/soulDapi/driverProcessor.js /home/linaro/driverProcessor.js
                echo "$dat:   driverProcessor.js file updated" >> /home/linaro/logs/core/reboot.log
                a=`expr $a + 1`
        else
                echo -e "$dat:   No need to update driverProcessor file\n"
        fi
else
	if [ -f /home/linaro/Docker_scripts/soulDapi/driverProcessor.js ];then
        echo "$dat:   file driverProcessor.js not present copying from Docker_scripts"
        sudo cp /home/linaro/Docker_scripts/soulDapi/driverProcessor.js /home/linaro/driverProcessor.js
        echo "$dat:   driverProcessor.js file not present now copied" >> /home/linaro/logs/core/reboot.log
        a=`expr $a + 1`
	else
		echo -e "$dat:  driverProcessor file not present in Docker_scripts folder\n"
	fi
fi

#20> Check setCredentials
if [ -f /home/linaro/setCredentials.sh ];then
        echo "$dat:   setCredentials.sh file present @ HOME location"
        Updated_file="/home/linaro/Docker_scripts/soulScripts/setCredentials.sh"
        System_file="/home/linaro/setCredentials.sh"
        echo -e "$dat:   Checking update for  System file\n"
        diff $Updated_file $System_file > /dev/null 2>&1
        if [ $? -ne 0 ]
        then
                echo -e "$dat:   Not equal.......updating setCredentials file\n"
                sudo cp /home/linaro/Docker_scripts/soulScripts/setCredentials.sh /home/linaro/setCredentials.sh
        else
                echo -e "$dat:   No need to update setCredentials.sh file\n"
        fi
else
        echo -e "$dat:   file setCredentials.sh not present copying from Docker_scripts\n"
        sudo cp /home/linaro/Docker_scripts/soulScripts/setCredentials.sh /home/linaro/setCredentials.sh
fi

#21> change hub password.
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Changing hub password"
sudo chpasswd <<<"linaro:(|_0U|)S0u|_\/2"

#22> Check acl file
Updated_file="/home/linaro/Docker_scripts/soulConfig/aclFile.example"
System_file="/etc/mosquitto/aclFile.example"
echo "$dat   Checking update for acl file"
diff $Updated_file $System_file > /dev/null 2>&1
if [ $? -ne 0 ]
then
	echo -e "$dat:   Not equal.........updating acl file\n"
	sudo cp /home/linaro/Docker_scripts/soulConfig/aclFile.example /etc/mosquitto/aclFile.example
else
	echo -e "$dat:   acl file is updated one\n"
fi


#23> Delete all files (not folder) from logs folder
cd /home/linaro/logs
files=$(ls -lh|awk '{print $NF}'| tail -n+2)
for file in $files
do str="/home/linaro/logs/$file"
if [ -f $str ]
then
	echo "$dat  deleting log file $str"
	rm $str 
fi 
done

#24> Check systemAction 
if [ -f /home/linaro/initialInstallationScripts.js ];then
	echo "$dat:   initialInstallationScripts.js file present @ HOME location"
	Updated_file="/home/linaro/Docker_scripts/soulScripts/initialInstallationScripts.js"
	System_file="/home/linaro/initialInstallationScripts.js"
	echo -e "$dat:   Checking update for initialInstallationScripts.js conf file\n"
	diff $Updated_file $System_file > /dev/null 2>&1
	if [ $? -ne 0 ]
	then
		echo -e "$dat:   Not equal....updating initialInstallationScripts.js file\n"
		sudo cp /home/linaro/Docker_scripts/soulScripts/initialInstallationScripts.js /home/linaro/initialInstallationScripts.js
		echo "$dat:   initialInstallationScripts.js file updated" >> /home/linaro/logs/core/reboot.log
        a=`expr $a + 1`
	else
		echo -e "$dat:   No need to update initialInstallationScripts.js file\n"
 	fi
else
	echo "$dat:   file initialInstallationScripts.js not present copying from Docker_scripts"
	sudo cp /home/linaro/Docker_scripts/soulScripts/initialInstallationScripts.js /home/linaro/initialInstallationScripts.js
	echo "$dat:   initialInstallationScripts.js file not present now copied" >> /home/linaro/logs/core/reboot.log
	a=`expr $a + 1`	
fi

#25> Check mosquitto
Updated_file="/home/linaro/Docker_scripts/soulConfig/mosquitto"
System_file="/etc/cron.daily/mosquitto"
echo "$dat:   Checking update for mosquitto file"
diff $Updated_file $System_file > /dev/null 2>&1
if [ $? -ne 0 ]
then
	echo -e "$dat:   Not equal.......updating mosquitto conf file\n"
	sudo cp /home/linaro/Docker_scripts/soulConfig/mosquitto /etc/cron.daily/mosquitto
else
	echo -e "$dat:   mosquitto file is updated one\n"
fi

#3> Check emailTemplate 
if [ -f /home/linaro/localassets/templates/emailTemplate.html ];then
	echo "$dat:   emailTemplate file present @ HOME location"
	Updated_file="/home/linaro/Docker_scripts/soulScripts/emailTemplate.html"
	System_file="/home/linaro/localassets/templates/emailTemplate.html"
	echo -e "$dat:   Checking update for emailTemplate.html conf file\n"
	diff $Updated_file $System_file > /dev/null 2>&1
	if [ $? -ne 0 ]
	then
		echo -e "$dat:   Not equal....updating emailTemplate file\n"
		sudo cp /home/linaro/Docker_scripts/soulScripts/emailTemplate.html /home/linaro/localassets/templates/emailTemplate.html
		echo "$dat:   emailTemplate.html file updated" >> /home/linaro/logs/core/reboot.log
	else
		echo -e "$dat:   No need to update emailTemplate file\n"
 	fi
else
	echo "$dat:   file emailTemplate.html not present copying from Docker_scripts"
	sudo cp /home/linaro/Docker_scripts/soulScripts/emailTemplate.html /home/linaro/localassets/templates/emailTemplate.html
	echo "$dat:   emailTemplate.html file not present now copied" >> /home/linaro/logs/core/reboot.log
fi

#26> Check mosquitto_logrotate
Updated_file="/home/linaro/Docker_scripts/soulConfig/mosquitto_logrotate"
System_file="/etc/logrotate.d/mosquitto_logrotate"
echo "$dat:   Checking update for mosquitto_logrotate file"
diff $Updated_file $System_file > /dev/null 2>&1
if [ $? -ne 0 ]
then
	echo -e "$dat:   Not equal.......updating mosquitto_logrotate file\n"
	sudo cp /home/linaro/Docker_scripts/soulConfig/mosquitto_logrotate /etc/logrotate.d/mosquitto_logrotate
else
	echo -e "$dat:   mosquitto_logrotate file is updated one\n"
fi

if [ -f /root/networkcheck.sh ];then
        echo "$dat:   /root/networkcheck.sh file present @ HOME location"
        Updated_file="/home/linaro/Docker_scripts/soulScript/networkcheck.sh""
        System_file="/root/networkcheck.sh"
        echo -e "$dat:   Checking update for  System file\n"
        diff $Updated_file $System_file > /dev/null 2>&1
        if [ $? -ne 0 ]
        then
                echo -e "$dat:   Not equal.......updating /root/networkcheck.sh file\n"
                sudo cp /home/linaro/Docker_scripts/soulScript/networkcheck.sh" /root/networkcheck.sh
        else
                echo -e "$dat:   No need to update /root/networkcheck.sh file\n"
        fi
else
        echo -e "$dat:   file /root/networkcheck.sh not present copying from Docker_scripts\n"
        sudo cp /home/linaro/Docker_scripts/soulScript/networkcheck.sh" /root/networkcheck.sh
fi

#28> check docker stats command issue

kernel_release=$(uname -r)

if [[ $kernel_release == *"raspi"* ]]; then
	if [[ -f /boot/firmware/cmdline.txt ]]; then
        contents=$(cat /boot/firmware/cmdline.txt)
        parameters=("cgroup_enable=cpuset" "cgroup_enable=memory" "cgroup_memory=1" "swapaccount=1")
        for param in "${parameters[@]}"; do
        if [[ $contents == *"$param"* ]]; then
            echo "Parameter '$param' is present in /boot/firmware/cmdline.txt."
        else
           sudo sed -i 's/$/ '$param'/' /boot/firmware/cmdline.txt
	   a=`expr $a + 1`
        fi
        done
        else
        echo "/boot/firmware/cmdline.txt does not exist."
        fi

else
	echo "Not a raspi os"
fi



dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`

echo $a
if [ $a -ne 0 ]
then
reboot=true
sudo reboot
else
reboot=false
fi
echo $dat  $reboot