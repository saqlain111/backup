#!/bin/bash

###Script to Update V2 Hub with server code and start soulsystem process####

soulScriptsCheck()
{
    ls /home/linaro/docker_scripts/soulScripts|grep ${file}
    if [ $? -eq 0 ]
    then
	dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`
        echo "$dat   $file found"
        word_count=$(cat /home/linaro/docker_scripts/soulScripts/${file} |wc -w)
        original_count=$(cat /home/linaro/soulsystem_V8/lib/soulScripts/${file} |wc -w)
        echo "$dat   Check word count in ${file} file"
        if [ $word_count -ne $original_count ]
        then
                a=`expr $a + 1`
                cp /home/linaro/soulsystem_V8/lib/soulScripts/${file} /home/linaro/docker_scripts/soulScripts/${file}
                echo "$dat   Update ${file} file********************"
        fi
    else
	dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`
        export a=`expr $a + 1`
        cp /home/linaro/soulsystem_V8/lib/soulScripts/${file} /home/linaro/docker_scripts/soulScripts/${file}
        echo "$dat   *****ERROR***File ${file} not present"
    fi
}

soulConfigCheck()
{
    dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`	
    ls /home/linaro/docker_scripts/soulConfig|grep ${file}
    if [ $? -eq 0 ]
    then
        echo "$dat   $file found"
        word_count=$(cat /home/linaro/docker_scripts/soulConfig/${file} |wc -w)
        original_count=$(cat /home/linaro/soulsystem_V8/lib/soulConfig/${file} |wc -w)
        echo "$dat   Check word count in ${file} file"
        if [ $word_count -ne $original_count ]
        then
                a=`expr $a + 1`
                cp /home/linaro/soulsystem_V8/lib/soulConfig/${file} /home/linaro/docker_scripts/soulConfig/${file}
                echo "$dat   Update ${file} file********************"
        fi
    else
        export a=`expr $a + 1`
        cp /home/linaro/soulsystem_V8/lib/soulConfig/${file} /home/linaro/docker_scripts/soulConfig/${file}
        echo "$dat   *****ERROR***File ${file} not present"
    fi
}

UpdateFile()
{
        #Update for Scripts
        dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`
        soulScripts_file=(Start_dockerContainer.sh dockerProcessMonitor.js systemActions.js initialInstallationScripts.js weeklydb.sh run_system_docker.sh webPortalScripts.sh restartSoulHub.sh run_systemStart.sh processMonitor.sh serverShh.js module-checker.js swapfile DockerStatus.sh module-checker.sh setCredentials.sh scene.json emailTemplate.html handoverTemplate.html registryChanges.sh)
        for file in "${soulScripts_file[@]}"
        do
                cp /home/linaro/soulsystem_V8/lib/soulScripts/${file} /home/linaro/docker_scripts/soulScripts/${file}
		a=`expr $a + 1`
        done

        #Update for config file

        soulConfig_file=(docker_logrotate.conf docker_root_crontab docker_mosquitto.conf mosquitto_sensor.conf docker_user_crontab aclFile.example mosquitto mosquitto_logrotate)
        for file in "${soulConfig_file[@]}"
        do
                cp /home/linaro/soulsystem_V8/lib/soulConfig/${file} /home/linaro/docker_scripts/soulConfig/${file}
		a=`expr $a + 1`
        done
}

# Check for directory
#sudo chown -R linaro:linaro /home/linaro/docker_scripts
#sudo chmod -R 755 /home/linaro/docker_scripts
cd /home/linaro/docker_scripts
if [ ! -d soulConfig ];then mkdir /home/linaro/docker_scripts/soulConfig;fi
if [ ! -d soulScripts ];then mkdir /home/linaro/docker_scripts/soulScripts;fi

dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`

export a=0
if [ -f /home/linaro/docker_scripts/soulScripts/version ]
then
        diff /home/linaro/soulsystem_V8/lib/soulScripts/version /home/linaro/docker_scripts/soulScripts/version > /dev/null 2>&1
        if [ $? -ne 0 ]
        then
                echo "$dat   *******Updating files*********"
                UpdateFile
                cp /home/linaro/soulsystem_V8/lib/soulScripts/version /home/linaro/docker_scripts/soulScripts/version
		a=`expr $a + 1`
        else
                echo "$dat   *****Updated****No need to update files****"
        fi
else
        cp /home/linaro/soulsystem_V8/lib/soulScripts/version /home/linaro/docker_scripts/soulScripts/version
        UpdateFile
        a=`expr $a + 1`
fi

cp -r /home/linaro/soulsystem_V8/lib/soulLogger /home/linaro/docker_scripts/soulScripts/
cp -r /home/linaro/soulsystem_V8/lib/node-lifx /home/linaro/docker_scripts/soulScripts/

#Check update for scripts

dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`

soulScripts_file=(dockerProcessMonitor.js systemActions.js initialInstallationScripts.js Start_dockerContainer.sh weeklydb.sh run_system_docker.sh webPortalScripts.sh restartSoulHub.sh run_systemStart.sh processMonitor.sh module-checker.js swapfile DockerStatus.sh module-checker.sh setCredentials.sh scene.json emailTemplate.html handoverTemplate.html registryChanges.sh)
for file in "${soulScripts_file[@]}"
do
        soulScriptsCheck $file

done

#Check update for config file

soulConfig_file=(docker_logrotate.conf docker_root_crontab docker_mosquitto.conf mosquitto_sensor.conf docker_user_crontab aclFile.example mosquitto mosquitto_logrotate)
for file in "${soulConfig_file[@]}"
do
        soulConfigCheck $file
done

#sudo chown -R linaro:linaro /home/linaro/docker_scripts
#sudo chmod -R 755 /home/linaro/docker_scripts

dat=`date -u +"%Y-%m-%dT%H:%M:%SZ"`

echo $a
if [ $a -ne 0 ]
then
reboot=true
else
reboot=false
fi
echo $dat  $reboot

#Run node process
echo "*****************************************************************************"
echo "$dat  Stating node process with flag=$reboot................"
node /home/linaro/soulsystem_V8/lib/soulProcesses/systemStart.js $reboot