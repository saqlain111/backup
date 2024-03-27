#!/bin/sh
RELEASE=`cat /etc/os-release |head -n 1 |cut -d "=" -f2|tr -d '"'`
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
else
	echo "os is not compatible"
fi