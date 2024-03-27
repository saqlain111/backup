#!/bin/bash

##Interval script to check status of running processes after every 20 min###

timeZone=`cat /home/linaro/db/timeZone`
export TZ=$timeZone
val=`cat /home/linaro/containerStatus`
if [ $val == 'completed' ]; then
	containerStart()
	{
	MyPROC=$1
	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Monitoring process $MyPROC"
	case $MyPROC in
	startstandalone)
			sudo docker rm -f startstandalone
			sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --name startstandalone -p 4001:4001 --env base_ip=$(sudo ifconfig $(ip route show | awk '/default/ {print $5}') | awk '/inet / {print $2}') --env broker_port="8886" --env ApplicationEnv="Docker" --env host_ip=$(hostname -I | awk '{print $2}') --net=host --env-file /etc/environment -itd -m 128M --cpuset-cpus="1" --cpu-shares=512 startstandalone
	;;
	portal)
			sudo docker rm -f portal
			sudo docker run -v sounds:/home/linaro/sounds -v localassets:/home/linaro/localassets -v db:/home/linaro/db -itd --name portal -p 80:80 portal
	;;
	pyprocess)
			sudo docker rm -f pyprocess
			sudo docker run --name pyprocess --env base_ip=$(sudo ifconfig $(ip route show | awk '/default/ {print $5}') | awk '/inet / {print $2}') --env broker_port="8886" --env-file /etc/environment -v /home/linaro/db:/CE/db/data -v Docker_scripts:/home/linaro/docker_scripts -v /home/linaro/logs:/CE/conf/logs -v sounds:/home/linaro/sounds -itd -m 256M --cpuset-cpus="0" --cpu-shares=512 pyprocess
	;;
	soulsystem)
			sudo docker rm -f soulsystem
			sudo docker run -v db:/home/linaro/db -v localassets:/home/linaro/localassets -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -v Docker_scripts:/home/linaro/docker_scripts --dns=8.8.8.8 --dns-search=www.google.com -u="linaro" --name soulsystem --net=host --env base_ip=$(sudo ifconfig $(ip route show | awk '/default/ {print $5}') | awk '/inet / {print $2}') --env broker_port="8886" --env ApplicationEnv="Docker"  --env host_ip=$(hostname -I | awk '{print $2}') --env-file /etc/environment -itd -m 128M --memory-swap 256M  --cpuset-cpus="1" --cpu-shares=512 soulsystem
	;;
	soulhub)
			sudo docker rm -f soulhub
			sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v localassets:/home/linaro/localassets -v node_modules:/home/linaro/node_modules -v sounds:/home/linaro/sounds -u="linaro" --name soulhub -p 3000:3000 --env base_ip=$(sudo ifconfig $(ip route show | awk '/default/ {print $5}') | awk '/inet / {print $2}') --env broker_port="8886" --env ${TZ} --env ApplicationEnv="Docker"  --env host_ip=$(hostname -I | awk '{print $2}') --env-file /etc/environment -itd -m 256M --memory-swap 512M  --cpuset-cpus="1" --cpu-shares=512 soulhub
	;;
	souldapi)
			sudo docker rm -f souldapi
			sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -v Docker_scripts:/home/linaro/docker_scripts -u="linaro" --name souldapi --env base_ip=$(sudo ifconfig $(ip route show | awk '/default/ {print $5}') | awk '/inet / {print $2}') --env broker_port="8886" --env ApplicationEnv="Docker"  --env host_ip=$(hostname -I | awk '{print $2}') --env-file /etc/environment -itd -m 128M --memory-swap 256M  --cpuset-cpus="1" --cpu-shares=512 souldapi
	;;
	udpserver)
			sudo docker rm -f udpserver
			sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --env HubSub="Basic" --name udpserver --net=host -p 5984:5984 --env base_ip=$(sudo ifconfig $(ip route show | awk '/default/ {print $5}') | awk '/inet / {print $2}') --env broker_port="8886" --env ApplicationEnv="Docker"  --env host_ip=$(hostname -I | awk '{print $2}') -itd -m 128M --cpuset-cpus="1" --cpu-shares=512 udpserver
	;;
	diagnostic)
			sudo docker rm -f  diagnostic
			sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --name diagnostic --env base_ip=$(sudo ifconfig $(ip route show | awk '/default/ {print $5}') | awk '/inet / {print $2}') --env broker_port="8886" --env ApplicationEnv="Docker"  --env host_ip=$(hostname -I | awk '{print $2}') -itd -m 128M --cpuset-cpus="1" --cpu-shares=512 diagnostic
	;;
	esac
	}


	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Checking mosquitto service status"
	ps -aef|grep mosquitto && netstat -tunpl|grep 8886
	if [ $? -ne 0 ];then
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " mosquitto service has stopped need to start it"
		sudo systemctl start mosquitto
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") ' mosquitto service start' >> /home/linaro/logs/core/reboot.log
		sudo reboot
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Checking for dockerProcessMonitor process"
	ps -aef|grep "node /home/linaro/dockerProcessMonitor.js"|grep -v grep
	if [ $? -ne 0 ]
	then
		arch=`dpkg --print-architecture`
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") $arch
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " node process has stopped starting it..."
		if [ $arch == 'arm64' ];then
			~linaro/node-v10.1.0-linux-arm64/bin/node /home/linaro/dockerProcessMonitor.js >> /home/linaro/logs/core/dockerProcessMonitor.log 2>&1 &
		elif [ $arch == 'amd64' ];then
			~linaro/node-v10.1.0-linux-x64/bin/node /home/linaro/dockerProcessMonitor.js >> /home/linaro/logs/core/dockerProcessMonitor.log 2>&1 &
		fi
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Checking for systemActions process"
	ps -aef|grep "node /home/linaro/systemActions.js"|grep -v grep
	if [ $? -ne 0 ]
	then
		export NODE_PATH=/home/linaro/node_modules/
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " exported node path $NODE_PATH"
		
		arch=`dpkg --print-architecture`
		echo $arch
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " node process has stopped starting it..."
		if [ $arch == 'arm64' ];then
			~linaro/node-v10.1.0-linux-arm64/bin/node /home/linaro/systemActions.js >> /home/linaro/logs/core/systemActions.log 2>&1 &
		elif [ $arch == 'amd64' ];then
			~linaro/node-v10.1.0-linux-x64/bin/node /home/linaro/systemActions.js >> /home/linaro/logs/core/systemActions.log 2>&1 &
		fi
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Checking for driver processor"
	ps -aef|grep "node /home/linaro/driverProcessor.js"|grep -v grep
	if [ $? -ne 0 ]
	then
		export NODE_PATH=/home/linaro/node_modules/
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " exported node path $NODE_PATH"
		
		arch=`dpkg --print-architecture`
		echo $arch
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " driverProcessor node process has stopped starting it..."
		if [ $arch == 'arm64' ];then
			USER_NAME=CEDDapi PASSWORD="@\$0uL|)@|?!" ~linaro/node-v10.1.0-linux-arm64/bin/node /home/linaro/driverProcessor.js >> /home/linaro/logs/core/driverProcessor.log 2>&1 &
		elif [ $arch == 'amd64' ];then
			USER_NAME=CEDDapi PASSWORD="@\$0uL|)@|?!" ~linaro/node-v10.1.0-linux-x64/bin/node /home/linaro/driverProcessor.js >> /home/linaro/logs/core/driverProcessor.log 2>&1 &
		fi
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Checking for initialInstallationScripts process"
	ps -aef|grep "node /home/linaro/initialInstallationScripts.js"|grep -v grep
	if [ $? -ne 0 ]
	then
		/home/linaro/Docker_scripts/soulScripts/webPortalScripts.sh >> /var/lib/docker/volumes/logs/_data/core/webPortalScripts.log 2>&1 &
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " checking status of startstandalone container process"
	sudo docker ps|grep -w startstandalone
	if [ $? -ne 0 ];then
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " *****startstandalone container has STOPPED"
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting it..."
		containerStart startstandalone
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " checking status of nginx container process"
	sudo docker ps|grep -w portal
	if [ $? -ne 0 ];then
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " *****portal container has STOPPED"
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting it..."	

		containerStart portal
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " checking status of pyprocess container process"
	sudo docker ps|grep -w pyprocess
	if [ $? -ne 0 ];then
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " *****pyprocess container has STOPPED"
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting it..."		
		containerList=(pyprocess soulhub)
		for container in ${containerList[@]}
		do
			echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Restarting $container container"		
			containerStart $container
			sleep 20s
		done
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " checking status of soulsystem container process"
	sudo docker ps|grep -w soulsystem
	if [ $? -ne 0 ];then
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " *****soulsystem container has STOPPED"
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting it..."
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Restarting $container container"
		container=soulsystem	
		containerStart $container
		sleep 2s
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " checking status of soulhub container process"
	sudo docker ps|grep -w soulhub
	if [ $? -ne 0 ];then
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " *****soulhub container has STOPPED"
		echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting it..."		
		containerStart soulhub
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " checking status of souldapi container process"
	sudo docker ps|grep -w souldapi
	if [ $? -ne 0 ];then
			echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " *****souldapi container has STOPPED"
			echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting it..."
			containerStart souldapi
	fi


	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " checking status of udpserver container process"
	sudo docker ps|grep -w udpserver
	if [ $? -ne 0 ];then
			echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " *****udpserver container has STOPPED"
			echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting it..."
			containerStart udpserver
	fi

	echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " checking status of diagnostic container process"
	sudo docker ps|grep -w diagnostic
	if [ $? -ne 0 ];then
			echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " *****diagnostic container has STOPPED"
			echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting it..."
			containerStart diagnostic
	fi
else
	echo -e "$dat:   start conetainer process is not completed $val\n"
fi




