sudo docker rm -f pyprocess
timeZone=`cat /home/linaro/db/timeZone`
sudo docker run --name pyprocess --env base_ip=$(sudo ifconfig $(ip route show | awk '/default/ {print $5}') | awk '/inet / {print $2}') --env broker_port="8886" --env-file /etc/environment -v /home/linaro/db:/CE/db/data -v /home/linaro/logs:/CE/conf/logs -v sounds:/home/linaro/sounds -itd -m 256M --cpuset-cpus="0" --cpu-shares=512 pyprocess
