#!/bin/bash

dat=`date "+%b %d %H:%M:%S"`
arch=`dpkg --print-architecture`
        echo $arch
        if [ $arch == 'arm64' ];then
		dat=`date "+%b %d %H:%M:%S"`
                echo -e "$dat   Updating PATH parameter for $arch\n"
                export PATH="/home/linaro/node-v10.1.0-linux-arm64/bin":$PATH
		echo $PATH
 	elif [ $arch == 'amd64' ];then
		dat=`date "+%b %d %H:%M:%S"`
                echo -e "$dat    Updating PATH parameter for $arch\n"
                export PATH="/home/linaro/node-v10.1.0-linux-x64/bin":$PATH
		echo $PATH
        fi

node -v
npm -v
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " Setting core folder inside logs folder..."
if [ ! -d /home/linaro/logs/core ];then mkdir /home/linaro/logs/core;fi
dat=`date "+%b %d %H:%M:%S"`
echo "$dat   Starting module-checker process"
node /home/linaro/module-checker.js >> /home/linaro/logs/core/module-checker.log 2>&1 &