#!/bin/bash
echo "killing processes...`date`" >> process_state
ps -ax | grep "node lib/start.js" | grep -v "grep" | awk '{print $1}' | xargs kill -2
sleep 3s && echo $date
echo "start.js---->$?" >> process_state
echo "`ps -ax|grep node`" >> process_state 
ps -ax | grep "node systemStart.js" | grep -v "grep" | awk '{print $1}' | xargs kill -2
echo "systemStart.js---->$?" >> process_state
sleep 2s && echo $date
echo "`ps -ax|grep node`" >> process_state 
ps -ax | grep "node soulUdpInput.js" | grep -v "grep" | awk '{print $1}' | xargs kill -2
sleep 2s && echo $date
echo "soulUdpInput.js---->$?" >> process_state
echo "`ps -ax|grep node`" >> process_state
sleep 2s && date
echo "ALL node process killed...`date`" >> process_state
