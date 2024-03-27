#!/bin/bash
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " uptime of hub ..." 
uptime
interface=$(sudo ip link show up | grep "state UP" | grep -v "docker" | grep -v "veth" | tr -s " " | cut -d ":" -f2 | head -1)
while [ -z $interface ]
  do
  sleep 5s
  echo "Still no interface running"
  interface=$(sudo ip link show up | grep "state UP" | grep -v "docker" | grep -v "veth" | tr -s " " | cut -d ":" -f2 | head -1)
done

echo "Current active interface is $interface"
base_ip=$(sudo  ifconfig $(sudo ip link show up | grep "state UP" | grep -v "docker" | grep -v "veth" | tr -s " " | cut -d ":" -f2 | head -1) | awk '/inet / {print $2}' | cut -d " " -f1 )
echo $base_ip

# if grep -R "Raspberry" /sys/firmware/devicetree/base/model; then
# 	sudo docker rm -f pyprocess
# 	sudo docker run --name pyprocess --env base_ip=$base_ip --env broker_port="8886" --env-file /etc/environment -v /home/linaro/db:/CE/db/data -v Docker_scripts:/home/linaro/docker_scripts -v /home/linaro/logs:/CE/conf/logs -v sounds:/home/linaro/sounds -itd -m 256M --cpuset-cpus="0" --cpu-shares=512 pyprocess

# 	sudo docker rm -f soulsystem
# 	sudo docker run -v db:/home/linaro/db -v localassets:/home/linaro/localassets -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -v Docker_scripts:/home/linaro/docker_scripts --dns=8.8.8.8 --dns-search=www.google.com -u="linaro" --name soulsystem --net=host --env base_ip=$base_ip --env broker_port="8886" --env ApplicationEnv="Docker"  --env host_ip=$(hostname -I | awk '{print $2}') --env-file /etc/environment -itd -m 128M --memory-swap 256M  --cpuset-cpus="1" --cpu-shares=512 soulsystem

# 	if ! grep -q "sudo python3 /home/linaro/Docker_scripts/APF/AP_WiFi.py" /etc/rc.local && ! grep -q "sudo bash /home/linaro/Docker_scripts/APF/hotspot.sh" /etc/rc.local; then
# 		sudo sed -i -e "/^exit 0/isudo bash /home/linaro/Docker_scripts/APF/hotspot.sh\nsudo python3 /home/linaro/Docker_scripts/APF/AP_WiFi.py" /etc/rc.local
# 		if [ $? -eq 0 ]; then
# 			echo "Lines added successfully to /etc/rc.local"
# 		else
# 			echo "Failed to add lines to /etc/rc.local"
# 			exit 1
# 		fi
# 	else
# 		echo "Lines are already present in /etc/rc.local, skipping addition."
# 	fi
# fi
hubIp="0.0.0.0"
if ( sudo ifconfig | grep wlan0 ); then
  hubIp=$(sudo ifconfig wlan0 | awk '/inet / {print $2}')
  echo "hub wifi ip is : $hubIp"
  counter=1
  while [ $counter -le 6 ] && [ -z $hubIp ]
    do
    echo $counter
    counter=$((counter + 1))
    sleep 5s
    echo "Still no interface running"
    hubIp=$(sudo ifconfig wlan0 | awk '/inet / {print $2}')
  done
fi

echo "hub wifi ip is : $hubIp"
if [[ -z $hubIp ]] | [[ $hubIp != "192.168.4.1" ]]; then
###Script to start all process and containers on V2 hub @reboot######
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " uptime of hub ..." 
uptime
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Setting permission and ownership..."
sudo chmod -R 755 /home/linaro
sudo chown -R linaro: /var/lib/docker/volumes/
sudo chmod -R 777 /var/lib/docker/volumes/
echo 'started' > /home/linaro/containerStatus

export NODE_PATH=/home/linaro/node_modules/
echo $NODE_PATH

echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Setting core folder inside logs folder..."
if [ ! -d /home/linaro/logs/core ];then mkdir /home/linaro/logs/core;fi
if [ -f /home/linaro/db/dbInit ]; then rm /home/linaro/db/dbInit; fi
  
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting docker containers....."

echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Setting auth key"
echo -e "mqtt_authkey=$mqtt_authkey"

echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " running registryChanges.sh script ..."
sudo bash /home/linaro/Docker_scripts/soulScripts/registryChanges.sh >> /var/lib/docker/volumes/logs/_data/core/registryChanges.log 2>&1 &
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " running run_system_docker.sh script ..."
/home/linaro/Docker_scripts/soulScripts/run_system_docker.sh >> /var/lib/docker/volumes/logs/_data/core/run_system_docker.log 2>&1 &
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " running setCredentials.sh script ..."
/home/linaro/Docker_scripts/soulScripts/setCredentials.sh >> /var/lib/docker/volumes/logs/_data/core/setCredentials.log 2>&1 &

arch=`dpkg --print-architecture`
if [ $arch == 'arm64' ];then
path=~linaro/node-v10.1.0-linux-arm64/bin/node
elif [ $arch == 'amd64' ];then 
path=~linaro/node-v10.1.0-linux-x64/bin/node
fi
echo $path
$path /home/linaro/dockerProcessMonitor.js >> /home/linaro/logs/core/dockerProcessMonitor.log 2>&1 &
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting systemActions process"
$path /home/linaro/systemActions.js >> /home/linaro/logs/core/systemActions.log 2>&1 &
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting soulDapi driver  process"
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " running webPortalScripts.sh script ..."
/home/linaro/Docker_scripts/soulScripts/webPortalScripts.sh >> /var/lib/docker/volumes/logs/_data/core/webPortalScripts.log 2>&1 &
USER_NAME=CEDDapi PASSWORD="@\$0uL|)@|?!" $path /home/linaro/driverProcessor.js >> /home/linaro/logs/core/driverProcessor.log 2>&1 &
cp -r /home/linaro/Docker_scripts/soulScripts/soulLogger /home/linaro/node_modules/
cp -r /home/linaro/Docker_scripts/soulScripts/node-lifx /home/linaro/node_modules/

timeZone=`cat /home/linaro/db/timeZone`
export TZ=$timeZone

echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting mosquitto_sensor"
sudo /usr/sbin/mosquitto -c /etc/mosquitto/mosquitto_sensor.conf &
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting mosquitto"
sleep 5s
sudo systemctl start mosquitto
sleep 2s
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting startstandalone"
sudo docker rm -f startstandalone
echo $base_ip
sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --name startstandalone --net=host -p 4001:4001 --env base_ip=$base_ip --env broker_port="8886" --env ApplicationEnv="Docker" --env host_ip=$"172.17.0.1" --env-file /etc/environment -itd -m 128M --cpuset-cpus="1" --cpu-shares=512 startstandalone
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting portal"
sudo docker rm -f portal
sudo docker run -v sounds:/home/linaro/sounds -v localassets:/home/linaro/localassets -v db:/home/linaro/db -itd --name portal -p 80:80 portal
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting pyprocess"
sudo docker rm -f pyprocess
sudo docker run --name pyprocess --env base_ip=$base_ip --env broker_port="8886" --env-file /etc/environment -v /home/linaro/db:/CE/db/data -v Docker_scripts:/home/linaro/docker_scripts -v /home/linaro/logs:/CE/conf/logs -v sounds:/home/linaro/sounds -itd -m 256M --cpuset-cpus="0" --cpu-shares=512 pyprocess
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting soulsystem"
sudo docker rm -f soulsystem
sudo docker run -v db:/home/linaro/db -v localassets:/home/linaro/localassets -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -v Docker_scripts:/home/linaro/docker_scripts --dns=8.8.8.8 --dns-search=www.google.com -u="linaro" --name soulsystem --net=host --env base_ip=$base_ip --env broker_port="8886" --env ApplicationEnv="Docker"  --env host_ip="172.17.0.1" --env-file /etc/environment -itd -m 128M --memory-swap 256M  --cpuset-cpus="1" --cpu-shares=512 soulsystem
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting soulhub"
sudo docker rm -f soulhub
sudo docker run -v db:/home/linaro/db -v localassets:/home/linaro/localassets -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -v sounds:/home/linaro/sounds -u="linaro" --name soulhub -p 3000:3000 --env base_ip=$base_ip --env broker_port="8886" --env ${TZ} --env ApplicationEnv="Docker"  --env host_ip="172.17.0.1" --env-file /etc/environment -itd -m 256M --memory-swap 512M  --cpuset-cpus="1" --cpu-shares=512 soulhub
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting souldapi"
sudo docker rm -f souldapi
sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -v Docker_scripts:/home/linaro/docker_scripts -u="linaro" --name souldapi --env base_ip=$base_ip --env broker_port="8886" --env ApplicationEnv="Docker"  --env host_ip="172.17.0.1" --env-file /etc/environment -itd -m 128M --memory-swap 256M  --cpuset-cpus="1" --cpu-shares=512 souldapi
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting udpserver"
sudo docker rm -f udpserver
sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --env HubSub="Basic" --name udpserver --net=host -p 5984:5984 --env base_ip=$base_ip --env broker_port="8886" --env ApplicationEnv="Docker"  --env host_ip=$"172.17.0.1" -itd -m 128M --cpuset-cpus="1" --cpu-shares=512 udpserver
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Starting diagnostic"
sudo docker rm -f  diagnostic
sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --name diagnostic --env base_ip=$base_ip --env broker_port="8886" --env ApplicationEnv="Docker"  --env host_ip="172.17.0.1" -itd -m 128M --cpuset-cpus="1" --cpu-shares=512 diagnostic
cat /home/linaro/containerStatus|grep startcontainer
echo 'completed' > /home/linaro/containerStatus
fi