#!/bin/bash
cd /home/linaro/soulHub
echo "killing soul hub process...`date`" >> process_state
ps -ax | grep "node lib/start.js" | grep -v "grep" | awk '{print $1}' | xargs kill -2