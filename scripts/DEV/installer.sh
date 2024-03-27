#!/bin/bash

function nodeInstall(){

    ################Getting hub Information & Hub serial ID###########################
    
            cd $HOME
        echo "***************"
            echo "Installing node"
        echo "***************"
            arch=`dpkg --print-architecture`
        if [ $arch == 'arm64' ]
        then
            wget $SERVER/V2HUB/V2_SETUP/node-v10.1.0-linux-arm64.tar.xz
        tar -xf node-v10.1.0-linux-arm64.tar.xz
        export PATH="$HOME/node-v10.1.0-linux-arm64/bin:$PATH"
            echo "export PATH="$HOME/node-v10.1.0-linux-arm64/bin:$PATH"" >> $HOME/.bashrc
        sed -i 's@^node@~linaro/node-v10.1.0-linux-arm64/bin/node@' $HOME/DockerV2/start_container.sh
        elif [ $arch == 'amd64' ]
        then
        wget $SERVER/V2HUB/V2_SETUP/node-v10.1.0-linux-x64.tar.xz
        tar -xf node-v10.1.0-linux-x64.tar.xz
        export PATH="$HOME/node-v10.1.0-linux-x64/bin:$PATH"
            echo "export PATH="$HOME/node-v10.1.0-linux-x64/bin:$PATH"" >> $HOME/.bashrc
        sed -i 's@^node@~linaro/node-v10.1.0-linux-x64/bin/node@' $HOME/DockerV2/start_container.sh
        fi
         
        if ( which node && node --version ); then
        echo "***************"
            echo "node is installed --> $?"
        echo "***************"
            else
        echo "***************"
            echo "node is not installed, please check"
        echo "***************"
        exit 1;
            fi
    
            wget $SERVER/V2HUB/V2_SETUP/soulsystem_V8/lib/soulScripts/systemActions.js
            wget $SERVER/V2HUB/V2_SETUP/soulsystem_V8/lib/soulScripts/dockerProcessMonitor.js
        echo "***************"
            echo "Get node and npm version"
        echo "***************"
            node -v
            npm -v
             
        echo "***************"
            echo "Install node modules for fetchserial"
        echo "***************"
}
    
    function basicSetup(){    
            echo "***************"
            echo "Creating volume"
            echo "***************"
            sudo docker volume create db
            sudo docker volume create logs
            sudo docker volume create node_modules
            sudo docker volume create Docker_scripts
            sudo docker volume create pyIOT_files
            sudo docker volume create pyIOT_logs
            sudo docker volume create sounds
    
            echo "Setting rule for port forwarding"
            sudo iptables -t nat -I PREROUTING -p tcp --dport 1883 -j REDIRECT --to-port 8884
    
            echo "Install required packages"
            sudo apt-get install network-manager xz-utils bluez mosquitto mosquitto-clients cron -y
           
            echo "mosquitto service setup"
            sudo sed -i '6 a port 8884' /etc/mosquitto/mosquitto.conf
            sudo systemctl start mosquitto
    
            if ( sudo which mosquitto ); then
            echo "***************"
            echo "mosquitto is installed --> $?"
            echo "***************"
            else
            echo "***************"
            echo "ERROR:mosquitto is not installed, please check"
            echo "***************"
            exit 1;
            fi
    
    
            MountpointDB=`sudo docker volume inspect db|grep Mountpoint|awk -F : '{ print $2}'|tr -d " \""|tr -d ","`
            MountpointNode=`sudo docker volume inspect node_modules|grep Mountpoint|awk -F : '{ print $2}'|tr -d " \""|tr -d ","`
    
            sudo chmod -R 777 $MountpointNode
            sudo chmod -R 777 $MountpointDB
            sudo chown -R linaro: /var/lib/docker
            sudo chmod -R 777 /var/lib/docker
    
            echo "***************"
            echo "create link for volume"
            echo "***************"
            ln -s /var/lib/docker/volumes/db/_data $HOME/db
            ln -s /var/lib/docker/volumes/node_modules/_data $HOME/node_modules
            ln -s /var/lib/docker/volumes/logs/_data $HOME/logs
            ln -s /var/lib/docker/volumes/Docker_scripts/_data $HOME/Docker_scripts
            ln -s /var/lib/docker/volumes/pyIOT_files/_data $HOME/pyIOT_files
            ln -s /var/lib/docker/volumes/pyIOT_logs/_data $HOME/pyIOT_logs
            ln -s /var/lib/docker/volumes/localassets/_data $HOME/localassets
            ln -s /var/lib/docker/volumes/sounds/_data $HOME/sounds
    
    
            sudo mkdir /home/linaro/logs/core
            sudo mkdir /home/linaro/localassets/Scene
            cd /home/linaro
            wget $SERVER/V2HUB/V2_SETUP/DOCKER/SCENE/Scene.tar.xz
    
            sudo tar -xf Scene.tar.xz -C /home/linaro/localassets/Scene
        sudo rm -rf /home/linaro/Scene.tar.xz
    
    
        echo 'https://dev.clouzer.com' > $MountpointDB/server
           
        echo "***************"
        echo "Setting up port"
        echo "***************"
        sudo sed -i '/#Port 22/c\Port 513' /etc/ssh/sshd_config
        sudo sed -i 's/Accept=yes/Accept=no/' /lib/systemd/system/ssh.socket
        sudo sed -i 's/ListenStream/#ListenStream/' /lib/systemd/system/ssh.socket
        echo "port setting done"
        sudo /etc/init.d/ssh restart
     
        echo "***************"
        echo "Download required node_modules"
        echo "***************"
        cd $HOME
        wget $SERVER/V2HUB/V2_SETUP/DockerV2.tar.gz
        tar -xf DockerV2.tar.gz
        cd /home/linaro/Docker_scripts 
        wget $SERVER/V2HUB/V2_SETUP/Docker_scripts.tar.gz
        tar -xzf Docker_scripts.tar.gz --strip-components=1 Docker_scripts/soulScripts Docker_scripts/soulConfig
        rm -rf Docker_scripts.tar.gz
        cd /home/linaro/Docker_scripts/soulScripts && chmod 777 * 
        platform=`uname -i`
        echo $platform
        if [ $platform == 'aarch64' -o $platform == 'unknown' ]
        then
            cd $MountpointNode
            wget $SERVER/V2HUB/V2_SETUP/node_modules_aarch64.tar.xz
            tar -xf node_modules_aarch64.tar.xz -C $MountpointNode
        else
            cd $MountpointNode
            wget $SERVER/V2HUB/V2_SETUP/node_modules_x86.tar.xz
            tar -xf node_modules_x86.tar.xz -C $MountpointNode
        fi
    
        echo "***************"
        echo "checking node modules"
        echo "***************"
            module_count=`ls /home/linaro/node_modules|wc -w`
        if [ $module_count -eq 0 ]
            then
        echo "***************"
            echo "ERROR:node_modules are not present, please check"
        echo "***************"
        exit 1;
            fi
    
        cd $MountpointNode
        rm -rf node_modules_x86.tar.xz node_modules_aarch64.tar.xz $HOME/DockerV2.tar.gz
    
        echo -e "{\n \"insecure-registries\":[\"modus.clouzer.com:5443\"]\n}"|sudo -u root tee /etc/docker/daemon.json
        sudo  service docker reload
        echo "admin@123"| sudo docker login --username cloudadmin --password-stdin modus.clouzer.com:5443 > /dev/null 2>&1
            if [ $? -eq 0 ];then
        echo "***************"
        echo "Docker registry logged in successfully"
        echo "***************"
            sudo service docker restart
            else
        echo "***************"
        echo "ERROR:Docker registry login failed"
        echo "***************"
            fi        
    }
    ########################################################################################################
    
    
    echo "Sudoers entry for linaro user"
    echo 'linaro    ALL=(ALL) NOPASSWD: ALL' | sudo EDITOR='tee -a' visudo
    
    if ( which docker && docker --version ); then
    echo "docker is installed properly"
    else
    echo "***************"
    echo "Installing docker"
    echo "***************"
     sudo apt-get update
     sudo apt-get install ca-certificates curl gnupg lsb-release jq -y
     sudo mkdir -p /etc/apt/keyrings
     curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
     echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
     sudo apt-get update
     sudo apt-get install docker-ce=5:19.03.15~3-0~debian-stretch docker-ce-cli=5:19.03.15~3-0~debian-stretch containerd.io
     sudo dpkg --configure -a
     sudo apt-get install -f
    fi
    
    echo "*******"
    echo "Checking Docker"
    echo "*******"
    if ( which docker && docker --version ); then
      echo "***************"
      echo "docker is installed properly"
      echo "***************"
    else
      echo "***************"
      echo "Docker is not installed. please verify"
      echo "***************"
      sudo dpkg --configure -a
      sudo apt-get install -f
      exit 1
    fi
    echo "***************"
    echo "Docker installed ---> $?"
    echo "***************"
    
    echo "***************"
    echo "Removing old setup"
    echo "***************"
    cd /home/linaro
    sudo rm -rf Docker_scripts db logs node_modules pyIOT_files pyIOT_logs node-v10.1.0-linux-*
    sed -i  '/node-v10.1.0/d' /home/linaro/.bashrc
    echo "Cleanup all docker setup"
    sudo docker system prune -f
    sudo docker rm -f $(sudo docker ps -a -q)
    sudo docker volume rm $(sudo docker volume ls -q)
    sudo docker  rmi $(sudo docker images -q)
    sudo -u root bash -c "cat /dev/null > /etc/environment"
    echo "install jq package ------------"
    sudo apt-get install jq -y
    SERVER='https://modus.clouzer.com'
    date=`date +%s%3N`
    echo "****Basic hub setup****"
    nodeInstall
    basicSetup
    sleep 1m
    sudo chmod -R 755 $HOME/DockerV2
    sudo -u root bash -c "echo -e "mqtt_authkey=`cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16`" >> /etc/environment"
    cd /home/linaro
    wget $SERVER/V2HUB/V2_SETUP/DEV/register_hub.sh
    chmod 777 register_hub.sh
    echo -e "@reboot /home/linaro/register_hub.sh > /home/linaro/hubregister.log 2>&1" >> $HOME/hub_register_cron
    echo "Setting cronjobs"
    cat $HOME/hub_register_cron | sudo crontab - 
    #sudo reboot
