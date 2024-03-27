#!/bin/bash

function checkInternetConnection(){
    
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
                HOME='/home/linaro'
                serverType=$1
                echo " server type : "$serverType
                
                if [ "$serverType" == "TEST" ];
                then
                    server="https://modus.clouzer.com"
                    nameSpace=${serverType}_123
                    serverfile="https://test.clouzer.com"
                elif [ "$serverType" == "DEV" ];
                then
                    server="https://dev.clouzer.com"
                    nameSpace=${serverType}_123
                    serverfile="https://dev.clouzer.com"
                else
                    server="https://modus.clouzer.com"
                    nameSpace='TEST_123'
                    serverfile="https://test.clouzer.com"
                fi
                echo $server
                echo $nameSpace
                echo $serverfile
                getMac
                registerhub
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
    
    
}
function getMac(){
    echo "check network interface:::::::::::::::::::::::::"  
    interfaces=$(ip -o link show | awk -F': ' '{print $2}')
    # Loop through interfaces and check if they are activated
    for interface in $interfaces; do
        status=$(ip -o link show dev $interface | awk '{print $9}')
        if [[ $status == UP ]]; then
            echo "Interface $interface is activated"
            macId=`ip link show $interface | awk '/ether/ {print $2}'`
            echo "mac: address::::::::::::::::$macId"
            MAC=`echo "$macId" | tr '[:lower:]' '[:upper:]'`
        else
            echo "Interface $interface is not activated"
        fi
        echo "interfaces ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::$interface"
    done
}

function registerhub(){
    echo "in ACK stock by mac"
    echo "MAC :::::::::::::::===========================================:: $MAC"
    echo "nameSpace :::::::::::::::===========================================:: $nameSpace"
    echo "in ACK stock by mac"
    response=$(curl --location --request GET "$server/hub/ackStockByMac" \
        --header 'username: release.user' \
        --header 'password: IUAjJCUpKComK189LQ==' \
        --header 'Content-Type: application/json' \
        -d "$(printf '{"macId": "%s", "namespaceId": "%s"}' "$MAC" "$nameSpace")"
    )
    # Display the output
    echo "ACK stock by mac Response: $response"
    echo "Send Percenatge for ACK_STOCK_BY_MAC Response: $response"
    cml_status=$(echo "$response" | jq -r '.CML_STATUS')
    
    echo "CML_STATUS: $cml_status"
    
    if [ $cml_status -eq 0 ]; then
        echo "hub is not available in inventry try again in one minute"
        sleep 60
        checkInternetConnection
        # exit 0  # Exit the process if cml_status is 0 or 2
    elif [ $cml_status -eq 1 ]; then
        echo "Continuing the shell script as cml_status is 1, hub is avalable in inventry procced  ..."
        echo "Download and execute the web socket connection script and set a crontab for the same script"
        echo "For now I don't have correct file path so that i am here putting register_hub.sh file YOU NEED TO REPLACE IT BEFORE GIVING TO SERVER @PRAVIN OR @ASHWINI"
        echo "$response" | openssl enc -aes-256-cbc -a -salt -pass "pass:$MAC" -iter 1000 >> "$HOME/authentication"
        cd $HOME
        wget $server/V2HUB/V2_SETUP/TEST/wsInstaller
        sudo chmod 777 wsInstaller
        echo -e "@reboot $HOME/wsInstaller >> $HOME/wsInstaller.log 2>&1" | sudo crontab -
        sudo reboot
    elif [ $cml_status -eq 2 ]; then
        echo "Hub is already registered. Stop the process"
    else
        echo "cml_status does not meet the specified conditions."
        exit 0
    fi
}

checkInternetConnection