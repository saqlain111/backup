#!/bin/bash

while true; do
    # Get the active network interface
    active_interface=$(ip route get 8.8.8.8 | awk 'NR==1 {print $5}')
    
    if [ -n "$active_interface" ]; then
        # Check internet connectivity
        if sudo ping -c 1 8.8.8.8 &> /dev/null; then
            # Get the IP address of the active interface
            ip_address=$(ip addr show dev $active_interface | awk '/inet / {print $2}' | cut -d '/' -f 1)
            
            # Print the results
            echo "Active Interface: $active_interface"
            echo "IP Address: $ip_address"
            
            # Download another script (example: download_script.sh)
            wget -O installer.sh https://modus.clouzer.com/V2HUB/V2_SETUP/TEST/installer.sh
            sudo chmod +x installer.sh
            ./installer.sh
            
            # Break out of the loop as we've successfully downloaded and executed the script
            break
        else
            # Print a message and sleep for 1 minute if no internet connectivity
            echo "No internet connectivity. Retrying in 1 minute..."
            sleep 60
        fi
    else
        # Print a message and sleep for 1 minute if no active interface is found
        echo "No active interface found. Retrying in 1 minute..."
        sleep 60
    fi
done