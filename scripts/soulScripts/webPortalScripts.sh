#!/bin/bash
while read line
do
echo $line
key=`awk -F "=" '{print $1}' <<< "$line"`
echo $key
val=`awk -F "=" '{print $2}' <<< "$line"`
if ([ $key = 'portalSetupFlag' ] && [ $val = true ]) || ([ $key = 'hubDeploymentType' ] && [ $val != 'c' ]);then
    echo "execute portal scripts"
        arch=`dpkg --print-architecture`
        if [ $arch == 'arm64' ];then
        path=~linaro/node-v10.1.0-linux-arm64/bin/node
        elif [ $arch == 'amd64' ];then
        path=~linaro/node-v10.1.0-linux-x64/bin/node
        fi
    $path /home/linaro/initialInstallationScripts.js >> /home/linaro/logs/core/initialInstallationScripts.log 2>&1
else
    echo -e "$dat:   No need to start initialInstallationScripts.js file\n"
fi
done < "/etc/environment"