#!/bin/bash

# Specify the log file path
log_file="/root/network.log"

# Function to log messages
log_message() {
    echo "$(date) $1" >> "$log_file"
}

# Log the script start
log_message "Script started."
sleep 5s

# Perform 10 ping requests to 8.8.8.8
ping_result=$(ping -c 10 8.8.8.8)

# Extract packet loss percentage using awk
packet_loss=$(echo "$ping_result" | grep -oP '\d+(?=% packet loss)')

# Check if packet loss is 100%
if [ "$packet_loss" -eq 100 ]; then
    log_message "Packet loss is 100%. Restarting wpa_supplicant.service..."

    # Execute the command to restart wpa_supplicant.service
    systemctl restart wpa_supplicant.service

    log_message "wpa_supplicant.service restarted. Checking if restart was successful..."

    # Wait for a few seconds to allow wpa_supplicant to restart
    sleep 5

    # Check the status of wpa_supplicant.service
    if systemctl is-active --quiet wpa_supplicant.service; then
        log_message "wpa_supplicant.service restarted successfully. Checking ping to 8.8.8.8..."

        # Perform 10 ping requests to 8.8.8.8
        ping_result_after_restart=$(ping -c 10 8.8.8.8)

        # Extract packet loss percentage using awk
        packet_loss_after_restart=$(echo "$ping_result_after_restart" | grep -oP '\d+(?=% packet loss)')

        # Log the result of the second ping
        log_message "Packet loss after restart: $packet_loss_after_restart"
    else
	log_message systemctl status wpa_supplicant.service >> service_status.log
        log_message "Failed to restart wpa_supplicant.service. Please check the service manually."
    fi
else
    log_message "Packet loss is not 100%. No action taken."
fi

# Log the script end
log_message "Script completed."

