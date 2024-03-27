#!/bin/bash

HOME='/home/linaro'
SERVER='https://modus.clouzer.com'
SCRIPT_PATH="/home/linaro/docker_daemon.sh"
DOCKER_DAEMON_SCRIPT_CONTENT="#!/bin/bash
sudo chmod 777 /var/lib/docker
sudo chown linaro:linaro /var/lib/docker
sudo chmod -R 777 /var/lib/docker/volumes
sudo chown -R linaro:linaro /var/lib/docker/volumes"
date=`date +%s%3N`
DOCKER_SERVICE_FILE="/lib/systemd/system/docker.service"

sudo -u root bash -c "cat /dev/null > /etc/environment"
function userPermission(){
    echo "Sudoers entry for linaro user"
    echo 'linaro    ALL=(ALL) NOPASSWD: ALL' | sudo EDITOR='tee -a' visudo
}

function removeSetup(){
    echo "***************"
    echo "Removing old setup"
    echo "***************"
    cd /home/linaro
    sudo rm -rf Docker_scripts db logs node_modules localassets sounds pyIOT_files pyIOT_logs node-v10.1.0-linux-*
    sudo sed -i  '/node-v10.1.0/d' /home/linaro/.bashrc
    echo "Cleanup all docker setup"
    sudo docker system prune -f
    sudo docker rm -f $(sudo docker ps -a -q)
    sudo docker volume rm $(sudo docker volume ls -q)
    sudo docker  rmi $(sudo docker images -q)
}


function dockerInstallation(){
    echo "Installing docker"
    echo "***************"
    sudo apt-get update
    sudo apt-get install ca-certificates curl gnupg lsb-release jq -y
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io -y
    sudo dpkg --configure -a
    sudo apt-get install -f
    echo "docker Installation successful"
    sudo chmod  777 /var/lib/docker
    sudo chown  linaro:linaro /var/lib/docker
}

function nodeInstall(){
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
    sudo sed -i 's@^node@~linaro/node-v10.1.0-linux-arm64/bin/node@' $HOME/DockerV2/start_container.sh
    elif [ $arch == 'amd64' ]
    then
    wget $SERVER/V2HUB/V2_SETUP/node-v10.1.0-linux-x64.tar.xz
    tar -xf node-v10.1.0-linux-x64.tar.xz
    export PATH="$HOME/node-v10.1.0-linux-x64/bin:$PATH"
    echo "export PATH="$HOME/node-v10.1.0-linux-x64/bin:$PATH"" >> $HOME/.bashrc
    sudo sed -i 's@^node@~linaro/node-v10.1.0-linux-x64/bin/node@' $HOME/DockerV2/start_container.sh
    fi
    wget $SERVER/V2HUB/V2_SETUP/soulsystem_V8/lib/soulScripts/systemActions.js
    wget $SERVER/V2HUB/V2_SETUP/soulsystem_V8/lib/soulScripts/dockerProcessMonitor.js
    node -v
    npm -v
    echo "Node Installation successfully"
}

function createDockervolume(){
    echo "Creating volume"
    echo "***************"
    sudo docker volume create db
    sudo docker volume create logs
    sudo docker volume create node_modules
    sudo docker volume create Docker_scripts
    sudo docker volume create pyIOT_files
    sudo docker volume create pyIOT_logs
    sudo docker volume create sounds
    echo "Creating volume successfully"
    sudo chmod -R 777 /var/lib/docker/volumes
    sudo chown -R linaro:linaro /var/lib/docker/volumes
    sudo touch /etc/systemd/system/docker_daemon.service
    sudo echo -e "[Unit]\nDescription=Adjust Docker Volume Permissions on Startup\nAfter=docker.service\n\n[Service]\nExecStart=/home/linaro/docker_daemon.sh\n\n[Install]\nWantedBy=default.target" |sudo tee /etc/systemd/system/docker_daemon.service
    sudo systemctl daemon-reload
    sudo systemctl enable docker_daemon.service
    sudo systemctl start docker_daemon.service
}

function packageInstall(){
    echo "Setting rule for port forwarding"
    sudo iptables -t nat -I PREROUTING -p tcp --dport 1883 -j REDIRECT --to-port 8884
    
    echo "Install required packages"
    sudo apt-get install network-manager xz-utils bluez mosquitto mosquitto-clients cron jq vim -y
    echo "mosquitto service setup"
    sudo sed -i '6 a port 8884' /etc/mosquitto/mosquitto.conf
    sudo systemctl start mosquitto
    echo "Setting rule for port forwarding & mosuitto installed successfully"
}

function dockerPermission(){
    echo "Setting dockerPermission"
    MountpointDB=`sudo docker volume inspect db|grep Mountpoint|awk -F : '{ print $2}'|tr -d " \""|tr -d ","`
    MountpointNode=`sudo docker volume inspect node_modules|grep Mountpoint|awk -F : '{ print $2}'|tr -d " \""|tr -d ","`
    
    sudo chmod -R 777 $MountpointNode
    sudo chmod -R 777 $MountpointDB
    sudo chown -R linaro: /var/lib/docker
    sudo chmod -R 777 /var/lib/docker

    echo "Setting dockerPermission successfully"
}

function volumeLinks(){
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
    echo "create link for volume successfully"
}

function createFolder(){
    echo "creating folders"
    sudo mkdir /home/linaro/logs/core
    sudo chmod 775 /home/linaro/logs/core
    sudo mkdir /home/linaro/localassets/Scene
    wget $SERVER/V2HUB/DOCKER/SCENE/Scene.tar.xz
    sudo tar -xf Scene.tar.xz -C /home/linaro/localassets/Scene
    sudo rm -rf /home/linaro/Scene.tar.xz
    echo "creating folder successfully"
}

function setSsh(){
    echo "Setting up port"
        echo "***************"
        sudo sed -i '/#Port 22/c\Port 513' /etc/ssh/sshd_config
        sudo sed -i 's/Accept=yes/Accept=no/' /lib/systemd/system/ssh.socket
        sudo sed -i 's/ListenStream/#ListenStream/' /lib/systemd/system/ssh.socket
        echo "port setting done"
        sudo /etc/init.d/ssh restart
        echo "Setting up port successfully"    
}

function nodeModulesdownload(){

    echo "Downloading node_modules"    
    MountpointNode=`sudo docker volume inspect node_modules|grep Mountpoint|awk -F : '{ print $2}'|tr -d " \""|tr -d ","`
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
        echo "download node_modules successfully"    
}

function dockerLogin(){
    echo "Docker registry log in "
    sudo mkdir /etc/docker
    echo -e "{\n \"insecure-registries\":[\"modus.clouzer.com:5443\",\"test.clouzer.com:5443\"]\n}"|sudo -u root tee /etc/docker/daemon.json
    sudo  service docker reload
    echo "admin@123"| sudo docker login --username cloudadmin --password-stdin modus.clouzer.com:5443 > /dev/null 2>&1
    echo "admin@123"| sudo docker login --username cloudadmin --password-stdin test.clouzer.com:5443 > /dev/null 2>&1
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
        echo "Docker registry logged in successfully"
}

check_docker_scirpt_setup_and_add() {
sudo echo "$DOCKER_DAEMON_SCRIPT_CONTENT" > "$SCRIPT_PATH"
sudo chmod a+x "$SCRIPT_PATH"
    if [ ! -f "$1" ]; then
        echo "Error: File not found at $1"
        exit 1
    fi

    if [ ! -x "$1" ]; then
        echo "Adding execute permission to $1"
        sudo chmod +x "$1"
    fi

    if grep -q "^ExecStartPost=$1" "$2"; then
        echo "ExecStartPost entry already exists in $2. Nothing added."
    else
        sudo sed -i "/^ExecStart=/a ExecStartPost=$1" "$2"
        echo "ExecStartPost added successfully to $DOCKER_SERVICE_FILE"
        sudo systemctl daemon-reload
        sudo systemctl restart docker
    fi
}

function download(){
    echo "Download register hub script"
    sudo -u root bash -c "echo -e "mqtt_authkey=`cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16`" >> /etc/environment"
    cd $HOME
    wget $SERVER/V2HUB/V2_SETUP/TEST/register_hub.sh
    sudo chmod 777 register_hub.sh
    echo -e "@reboot sleep 60 && /home/linaro/register_hub.sh > /home/linaro/hubregister.log 2>&1" >> $HOME/hub_register_cron
        echo "Download register hub script successfully"
}

function setCronjob(){
    echo "Setting cronjobs"
    cat $HOME/hub_register_cron | sudo crontab - 
    echo "Setting cronjobs successfully"
}

userPermission
removeSetup
packageInstall
dockerInstallation
check_docker_scirpt_setup_and_add "$SCRIPT_PATH" "$DOCKER_SERVICE_FILE"
nodeInstall
createDockervolume
#packageInstall
#dockerPermission
volumeLinks
createFolder
setSsh
nodeModulesdownload
dockerLogin
download
setCronjob

#linaro entry in sudoers ---------------------> done

function checkUserExist(){
    string_to_check="linaro ALL=(ALL) NOPASSWD: ALL"
    file_path="/etc/sudoers"

    if grep -q "$string_to_check" "$file_path"; then
    echo "The string '$string_to_check' is present in the file."
    else
    echo "The string '$string_to_check' is not found in the file."
    userPermission
    fi

######### to check all permission to linaro
    sudo getent passwd linaro
}

# Check if Docker is installed
function checkDocker(){
    if ! command -v docker &> /dev/null; then
	    echo "Docker is not installed."
        dockerInstallation
		exit 1
	else
		echo "Docker is installed."
        docker_version=$(docker --version | awk '{print $3}')
		echo "Docker version: $docker_version"
	fi

}

# Check if Node.js is installed
function checkNode(){
    if command -v node >/dev/null 2>&1; then
    echo "Node.js is installed."
    node_version=$(node -v)
    echo "Node.js version: $node_version"
else
    echo "Node.js is not installed."
    nodeInstall
    exit 1
fi

}

function checkNpm(){
if command -v npm >/dev/null 2>&1; then
    echo "npm is installed."
else
    echo "npm is not installed."
fi
}

function dockerVolume(){
    volumes=("db" "logs" "pyIOT_files" "sounds" "Docker_scripts" "localassets")
    # Check if each volume exists and create if missing
    for volume in "${volumes[@]}"
    do
    if sudo docker volume inspect "$volume" >/dev/null 2>&1; then
        echo "Volume '$volume' already exists."
    else
        echo "Creating volume '$volume'..."
        sudo docker volume create "$volume"
        echo "Volume '$volume' created."
    fi
    done

}

function checkpackages(){
    packages=("network-manager" "xz-utils" "bluez" "mosquitto" "mosquitto-clients" "cron"  "jq")

    for package in "${packages[@]}"; do
    if ! dpkg -l | grep -q "^ii\s*$package\s"; then
    echo "$package is not installed"
    sudo apt-get install $package -y
    # You can add installation command here, for example: sudo apt-get install $package
    else
    echo "$package is installed"
    fi
    done

}

function checkFolder(){

#Folder present ---> /home/linaro/logs/core  DockerV2.tar.gz  Docker_scripts.tar.gz

folders=("/home/linaro/logs/core" "DockerV2.tar.gz" "Docker_scripts.tar.gz")

for folder in "${folders[@]}"; do
    if [ -d "$folder" ]; then
        echo "The folder $folder exists."
    else
        echo "The folder $folder does not exist."
	wget https://test.clouzer.com/V2HUB/V2_SETUP/DockerV2.tar.gz
    mkdir /home/linaro/logs/core 

    fi
done
}


#check persmission for docker
function checkDockerPermission(){

folder="/var/lib/docker"

# Check read permission
    if [ -r "$folder" ]; then
        echo "Read permission is granted for $folder."
    else
        echo "Read permission is not granted for $folder."
        dockerPermission
    fi

# Check write permission
    if [ -w "$folder" ]; then
        echo "Write permission is granted for $folder."
    else
        echo "Write permission is not granted for $folder."
        dockerPermission
    fi

# Check execute permission
    if [ -x "$folder" ]; then
        echo "Execute permission is granted for $folder."
    else
        echo "Execute permission is not granted for $folder."
        dockerPermission
    fi
}

#docker registry login

function checkDockerlogin(){
    registry_url="modus.clouzer.com:5443"

    # Function to check Docker registry login status
    check_docker_registry_login() {
        if sudo docker info | grep -qE "(Username|IdentityFile)"; then
            return 0  # Logged in
        else
            echo "Logging in to Docker registry: $registry_url"
            dockerLogin
        fi
    }

# Function to log in to Docker registry
 #   docker_registry_login() {
  #      echo "Logging in to Docker registry: $registry_url"
   #     echo -e "{\n \"insecure-registries\":[\"test.clouzer.com:5443\"]\n}"|sudo -u root tee /etc/docker/daemon.json
    #    echo "admin@123"| sudo docker login --username cloudadmin --password-stdin $registry_url > /dev/null 2>&1
    #}

# Main script
  #  if check_docker_registry_login; then
   #     echo "Already logged in to Docker registry: $registry_url"
    #else
     #   docker_registry_login
    #fi
#'
}

#node module count
function checkNodemoules(){
      module_count=`ls /home/linaro/node_modules|wc -w`
        if [ $module_count -eq 0 ]
            then
        echo "***************"
            echo "ERROR:node_modules are not present, please check"
        nodeModulesdownload
        echo "***************"
     #   exit 1;
            fi
}

#ssh service start and set port

function checkSshservice(){
    # Function to check if SSH service is running
   # check_ssh_status() {
        if systemctl is-active --quiet ssh; then
            echo "SSH service is already running."
        else
            setSsh
            echo "SSH service restarted."
            #return 1  # SSH is not running
        fi
    #}

}

#link create for volume

checkUserExist
checkDocker
checkNode
checkNpm
dockerVolume
checkpackages
checkDockerPermission
checkDockerlogin
checkNodemoules
checkSshservice
sudo reboot