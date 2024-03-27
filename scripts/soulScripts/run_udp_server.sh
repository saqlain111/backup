#!/bin/bash

LinuxArch=$(uname -m )

if [ $LinuxArch == 'armv7l' ] ; then
    export PATH=$HOME/node-v10.1.0-linux-armv7l/bin:$PATH
else
    export PATH=$HOME/node-v10.1.0-linux-arm64/bin:$PATH
fi

cd /home/linaro/soulsystem_V8/lib/soulComm
node soulUdpInput.js  >> /home/linaro/logs/soulUdp-Server.log 2>&1 &