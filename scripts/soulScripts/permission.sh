#!/bin/bash

/home/linaro/hub/scripts/checkenv.sh
source /etc/environment
cd /home/linaro
LINES=$(find /home/linaro/SoulSystem -name '*.sh' | wc -l)

echo "Lines are" $LINES

for i in $(seq 1 $LINES) 
do
   echo "Welcome $i times"
   FILE=$(find soulsystem_V8 -name '*.sh' | sed -n ${i}p)
   sudo chmod 777 $FILE
   if [ $? -eq 0 ]; then
    echo OK
   else
    echo FAIL
   fi
done

cd /home/linaro
sudo chown -R linaro:linaro soulHub
sudo chown -R linaro:linaro logs
sudo chown -R linaro:linaro sensorjson
sudo chown -R linaro:linaro portal
sudo chown -R linaro:linaro soulsystem_V8
sudo chown -R linaro:linaro sounds
sudo chown -R linaro:linaro node_modules

cd /home
sudo chown -R linaro:linaro linaro
