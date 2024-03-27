#!/bin/bash

add_registry() {
    local registry="$1"
    if grep -r "$registry" /etc/docker/daemon.json; then
        echo "Registry $registry already present"
    else
        echo "Registry $registry not present, adding now"
        sudo sed -i '/insecure-registries/s/\[/\[\"'"$registry"':5443",/' /etc/docker/daemon.json
        sudo /etc/init.d/docker reload
        echo "admin@123" | sudo docker login --username cloudadmin --password-stdin "$registry:5443" > /dev/null 2>&1
    fi
}

add_registry "test.clouzer.com"
add_registry "modus.clouzer.com"
add_registry "hubrepo.clouzerindia.com"