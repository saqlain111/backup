#!/bin/bash

LinuxArch=$(uname -m )

if [ $LinuxArch == 'armv7l' ] ; then
    export PATH=$HOME/node-v10.1.0-linux-armv7l/bin:$PATH
else
    export PATH=$HOME/node-v10.1.0-linux-arm64/bin:$PATH
fi

cd /home/linaro/soulsystem_V8/lib/soulData

ps -ax | grep "node /home/linaro/soulsystem_V8/lib/soulData/databaseBackup.js" | awk '{print $1}' | xargs kill -2
echo $(date -u +"%Y-%m-%dT%H:%M:%SZ") " starting databaseBackup.js"
node /home/linaro/soulsystem_V8/lib/soulData/databaseBackup.js > ./logs/dbBackup.log > ./logs/dbBackup.err
