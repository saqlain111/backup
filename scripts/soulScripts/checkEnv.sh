#!/bin/bash

cat /etc/environment|grep -w export > /dev/null 2>&1
if [ $? -eq 0 ]
then
	sed -i 's/export //g' /etc/environment
fi

#####################################################################
env=`cat /etc/environment | awk -F "=" '{print $1}'|sort -u`
for i in $env
do
    echo $i
    envcnt=`grep -cw $i /etc/environment`
    if [ $envcnt -gt 1 ];then
        sort -u /etc/environment > /tmp/abc
        cat /tmp/abc > /etc/environment
		else
	if [ $i == CML_GENERATION -o $i == CML_HUB_SUBSCRIPTION -o $i == CML_HUB_TYPE -o $i == CML_INSTALATION_DATE -o $i == HUB_TYPE -o $i == HubSub ]
	then
	    echo "All proper field"
	else
	    echo "Deleting line"
	    sed -i '/'$i'/d' /etc/environment
	fi

    fi
done
