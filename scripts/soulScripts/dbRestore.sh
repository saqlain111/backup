#!/bin/bash

LinuxArch=$(uname -m )

if [ $LinuxArch == 'armv7l' ] ; then
    export PATH=$HOME/node-v10.1.0-linux-armv7l/bin:$PATH
else
    export PATH=$HOME/node-v10.1.0-linux-arm64/bin:$PATH
fi

ps -ax | grep "dbRestore.js" | awk '{print $1}' | xargs kill -2
cd /home/linaro/soulsystem_V8/lib/soulData
node dbRestore.js

