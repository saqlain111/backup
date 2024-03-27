#!/bin/bash

sudo docker rm -f weeklydb
sudo docker run -v db:/home/linaro/db -v localassets:/home/linaro/localassets -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --name weeklydb --env base_ip=$(hostname -I | awk '{print $1}') --env broker_port="8886" --env -itd -m 128M --cpuset-cpus="1" --cpu-shares=512 weeklydb
