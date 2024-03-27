'use strict';
require('shelljs/global');
const mqtt = require('mqtt');
const os = require('os');
const request = require('request');
const progress = require('request-progress');
const si = require('systeminformation');
const osu = require('node-os-utils');
const ip = require('ip');
const fs = require('fs');
const network = require('network');
const ping = require('ping');
const semver = require('semver');
const async = require('async');
const properties = require('properties');
const crypto = require('crypto');
const path = require('path');
const propOptions = {
    sections: true,
    comments: '#',
    separators: '=',
    strict: true,
};
const hubType = process.env.HUB_TYPE;
const hubSub = process.env.HubSub;
let platform = os.platform();
const host_ip = process.env.host_ip;
let lastUpdatedHubType = {}
let GROUP;
let HOME;
let OWNER = 'linaro';
if (platform == "linux") {
    HOME = "/home/linaro/";
    GROUP = "linaro";
} else {
    GROUP = "staff";
}
let server = fs.readFileSync(`${HOME}/db/server`, { encoding: 'utf8' }).trim();
const serial = fs.readFileSync(`${HOME}/db/serial`, { encoding: 'utf8' }).trim();
const mqtt_authkey = process.env.mqtt_authkey ? process.env.mqtt_authkey : 'NA';
console.log(` soulsystem - systemActions - systemActions - mqtt_authkey ${mqtt_authkey} -  -  -  -  - `);
let mqttSubscribeTopics = ['soulHubAction/#', 'maintenanceAction/requestAction', 'soulDapi/driverUpdate', 'soulDapi/deleteDriver'];

const MQTT_HOST = process.env.ApplicationEnv && process.env.ApplicationEnv == 'Docker' ? '172.17.0.1' : "0.0.0.0";
const MQTT_PORT = process.env.broker_port ? process.env.broker_port : '8886';
let portalSetupFlag = process.env.portalSetupFlag ? process.env.portalSetupFlag : null;

let networkCommunicationId, updated = false,
    mqttclient;

let systemActionId = 'systemAction_' + serial;
let willPayload = { clientId: systemActionId, action: 'disconnected', ts: new Date().getTime(), process: 'systemActions' };
let filenameArr = [];
let pass = '@$0uL$y$tem';

let hubOs = {
    'Linux': 1,
    'MAC': 2,
    'WIN': 3,
    'Ubuntu': 4,
    'Debian': 5,
    'Raspbian': 6
}

const sendPercentage = (type, perc, status, process) => {
    try {
        let percentageObj = {
            type: "send_percentage",
            data: {
                "operation": type,
                "process": process,
                "percentage": perc,
                "status": status,
                "ts": new Date().getTime(),
            }
        }
        mqttWrite('percentage/send', percentageObj)
    } catch (error) {
        console.log(`${new Date().toJSON()} - SystemAction : sendPercentage error ${error}`)
        console.log(`${new Date().toJSON()} - SystemAction : sendPercentage - Exception occured!!! -  -  -  -  - `);
        console.log(error)
    }
}

mqttclient = mqtt.connect('mqtt://' + MQTT_HOST + ':' + MQTT_PORT, {
    username: 'CEDSystem',
    password: pass,
    will: {
        topic: 'process/status/systemActions',
        payload: JSON.stringify(willPayload)
    },
    clientId: systemActionId,
    reconnectPeriod: 100000,
    keepalive: 60,
});

const getDeploymentType = () => {
    return process.env.hubDeploymentType ? process.env.hubDeploymentType : 'a';
}

const getRegistryUrl = () => {
    /* if (server.includes("www.clouzer.com")) {
        return "www.clouzer.com:5443";
    }
    if(server.includes("test.clouzer.com")){
        if(hubType=='prod'){
            return "modus.clouzer.com:5443";
        }else{
            return "test.clouzer.com:5443";
        }
    }else{
        return "hubrepo.clouzerindia.com:5443";
    } */
    if (server.includes("www.clouzer.com")) {
        return "www.clouzer.com:5443";
    }
    if (server.includes("test.clouzer.com")) {
        return "test.clouzer.com:5443";
    } else {
        return "hubrepo.clouzerindia.com:5443";
    }
}

const getRegistryUrlforDrivers = () => {
    if (server.includes("www.clouzer.com")) {
        return "www.clouzer.com:5443";
    }
    if (server.includes("test.clouzer.com")) {
        return "test.clouzer.com:5443";
    } else {
        return "hubrepo.clouzerindia.com:5443";
    }
}

mqttclient.on('connect', () => {
    console.log(`${new Date().toJSON()} - SystemAction : connected to - ${MQTT_HOST}`);
    mqttclient.subscribe(mqttSubscribeTopics);
    let ProcessObj = {
        "action": "connected",
        "ts": new Date().getTime(),
        "process": "systemActions",
    }
    mqttWrite("process/status/systemActions", ProcessObj);
});

mqttclient.on('disconnect', () => {
    console.log(`${new Date().toJSON()} - systemAction : Mqtt client disconnect event triggered `);
});

mqttclient.on('close', () => {
    console.log(`${new Date().toJSON()} - systemAction : Mqtt client disconnected from server`);
    mqttclient.end();
});

mqttclient.on('end', () => {
    console.log(`${new Date().toJSON()} - systemAction :  mosquitto client end event triggered`);
    mqttclient.end();
});


mqttclient.on('error', (error) => {
    console.log(`${new Date().toJSON()} - systemAction : mosquitto client error event triggered ${error}`);
    mqttclient.end();
});

const mqttWrite = (topic, data) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : mqttWrite : In the function  publishing the data on topic - ${topic}`);
        console.log(`${new Date().toJSON()} - systemAction : mqttWrite : In the function  publishing the mesage - ${JSON.stringify(data)}`);
        mqttclient.publish(topic, JSON.stringify(data));
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : mqttWrite : Execption occured while `);
        console.log(error);
    }
}

const sendOsData = (iMessage) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : sendOsData :  In the function `);
        let drive = osu.drive;
        let osROMinfo = {};
        let os_type = exec(`lsb_release -d | awk '{print " "$2}'`).trim();
        let netData = os.networkInterfaces();
        let os_version;
        let os_type1 = exec(`lsb_release -d | awk '{print " "$2}'`).toString().trim()
        if (os_type1 && os_type1 === "Debian" || os_type1 === "Raspbian") {
            os_version = exec(`lsb_release -d | awk '{print " "$4}'`).toString().trim()
        } else if (os_type1 && os_type1 === "Ubuntu") {
            os_version = exec(`lsb_release -d | awk '{print " "$3}'`).toString().trim()
        }
        drive.info()
            .then(details => {
                console.log(details)
                osROMinfo['remainingRom'] = details.freeGb;
                osROMinfo['totalRom'] = details.totalGb;
                console.log(`${new Date().toJSON()} - osROMinfo : ${JSON.stringify(osROMinfo)}`);
                if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey && osROMinfo && Object.keys(osROMinfo).length > 0) {
                    si.cpu((info) => {
                        console.log(`${new Date().toJSON()} - osROMinfo : ${JSON.stringify(osROMinfo)}`);
                        console.log(`${new Date().toJSON()} - cpuinfo : ${JSON.stringify(info)}`);
                        let osData = {
                            data: {
                                used_ram_memory: ((((os.totalmem() - os.freemem()) / 1024) / 1024) / 1024).toFixed(2) + " GB",
                                total_memory: (((os.totalmem() / 1024) / 1024) / 1024).toFixed(2) + " GB",
                                remainingMemory: ((os.freemem() / 1024) / 1024) / 1024 + " GB",
                                usedRom: (osROMinfo.totalRom - osROMinfo.remainingRom).toFixed(2) + " GB", // (((os.totalmem() - os.freemem()) / 1024) / 1024) / 1024 + " GB",
                                remainingRom: osROMinfo.remainingRom + " GB",
                                totalRom: osROMinfo.totalRom + " GB",
                                processingSpeed: info.speed + " GHz",
                                ostype: hubOs[os_type],
                                osVersion: os_version,
                                bluetoothAddress: exec(`hcitool dev|grep hci0|awk '{print $2}'`).trim(),
                            },
                            communicationId: iMessage.communicationId
                        }
                        let interfaces = Object.keys(os.networkInterfaces());
                        console.log(`${new Date().toJSON()} - network element interfaces ${interfaces}`)
                        interfaces.forEach(function (element, id, arr) {
                            console.log(`${new Date().toJSON()} - network element ${element}`)
                            if (element != 'lo') {
                                if (element && element.charAt(0) == 'w' && netData && netData[element] && netData[element].length > 0 && netData[element][0].hasOwnProperty("mac") && netData[element][0].hasOwnProperty("address")) {
                                    let Wifiarray = netData[element];
                                    osData.data['CML_WIFI_MAC'] = Wifiarray[0].mac;
                                    osData.data['CML_HUB_WIFI_IP'] = Wifiarray[0].address;
                                }
                                if (element && element.charAt(0) == 'e' && netData && netData[element] && netData[element].length > 0 && netData[element][0].hasOwnProperty("mac") && netData[element][0].hasOwnProperty("address")) {
                                    let Etharray = netData[element];
                                    osData.data['CML_ETH_MAC'] = Etharray[0].mac;
                                    osData.data['CML_HUB_ETH_IP'] = Etharray[0].address;
                                }
                            }
                        });
                        console.log(`${new Date().toJSON()} - Os : Data final object ${JSON.stringify(osData)}`);
                        mqttWrite("systemAction/responseAction", osData)
                    })
                }
            })
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : sendOsData : Exception occured !!`);
        console.log(error);
    }
}

const rebootHub = (iMessage) => {
    try {
        let deploymentType = lastUpdatedHubType['hubDeploymentType'] ? lastUpdatedHubType['hubDeploymentType'] : getDeploymentType();
        console.log(`${new Date().toJSON()} - systemAction : rebootHub : In the function authKey : ${iMessage.data.authKey} portalsetupFalg : ${portalSetupFlag} deploymentType : ${deploymentType}`);
        if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey) {
            let existsfile = fs.existsSync(`${HOME}db/dbInit`, 'utf-8');
            if (existsfile) {
                fs.unlink(`${HOME}db/dbInit`, (err) => {
                    if (err) {
                      console.error(` ${new Date().toJSON()} - Error deleting file: ${err}`);
                    } else {
                      console.log(`${new Date().toJSON()} - File ${HOME}/db/dbInit deleted successfully.`);
                    }
                  });
            }
            if (iMessage.hasOwnProperty("CallerInfo") && iMessage.CallerInfo.hasOwnProperty("source") && iMessage.CallerInfo.source.includes("hardreset") && portalSetupFlag) {
                console.log(` ${new Date().toJSON()} - setting time zone`)
                if (deploymentType == "a" || deploymentType == "b" || deploymentType == "e" || deploymentType == "g" || deploymentType == "l" || deploymentType == "m") {
                    exec(`echo '"America/New_York"' > ${HOME}/db/timeZone`)
                } else if (deploymentType == "d") {
                    exec(`echo '"America/Denver"' > ${HOME}/db/timeZone`)
                }
                else if (deploymentType == "f") {
                    exec(`echo '"Asia/Kolkata"' > ${HOME}/db/timeZone`)
                } else if (deploymentType == "i" || deploymentType == "j") {
                    exec(`echo '"Pacific/Honolulu"' > ${HOME}/db/timeZone`)
                } else if (deploymentType == "k") {
                    exec(`echo '"Australia/Sydney"' > ${HOME}/db/timeZone`)
                }
                console.log(`${new Date().toJSON()} - systemAction : rebootHub : Hub rebooted sucessFully`);
                let obj = JSON.stringify({ action: "power Reboot-sudo reboot-SoulSystem", Path: process.env.PWD, Timestamp: new Date().toJSON(), User: process.env.USER })
                exec(`echo ${obj} >> ${HOME}/logs/core/reboot.log`);
                exec(`sudo reboot`);
            } else {
                console.log(`${new Date().toJSON()} - systemAction : rebootHub : Hub rebooted sucessFully`);
                let obj1 = JSON.stringify({ action: "power Reboot-sudo reboot-SoulSystem", Path: process.env.PWD, Timestamp: new Date().toJSON(), User: process.env.USER })
                exec(`echo ${obj1} >> ${HOME}/logs/core/reboot.log`);
                exec(`sudo reboot`);
            }
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : rebootHub : Exception occured !!`);
        console.log(error);
    }
}

const geneartesshKeys = (iMessage) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : geneartesshKeys : In the function authKey : ${iMessage.data.authKey}`);
        if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey) {
            console.log(`${new Date().toJSON()} - systemAction : geneartesshKeys : platform : ${platform}`)
            if (platform == 'linux') {
                exec(` yes y | sudo ssh-keygen -q -b 4096 -t rsa -N '' -f /etc/ssh/ssh_host_rsa_key`);
                exec(` yes y | sudo ssh-keygen -q -b 521 -t ecdsa -N '' -f /etc/ssh/ssh_host_ecdsa_key`);
                exec(` yes y | sudo ssh-keygen -q -b 4096 -t ecdsa -N '' -f /etc/ssh/ssh_host_ed25519_key`);
                exec(`sudo systemctl restart ssh`, (ierr) => {
                    if (!ierr) {
                        mqttWrite("systemAction/responseAction", {
                            data: { systemActionFlag: true },
                            communicationId: iMessage.communicationId
                        });
                    } else {
                        mqttWrite("systemAction/responseAction", {
                            data: { systemActionFlag: false },
                            communicationId: iMessage.communicationId
                        });
                    }

                });
            }
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : geneartesshKeys : Exception occured !!`);
        console.log(error);
    }
}

const resetCrontab = (iMessage) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : resetCrontab : In the function authKey : ${iMessage.data.authKey}`);
        if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey) {
            if (platform === 'linux') {
                if (iMessage.data.crontabType == 'root') {
                    console.log(`${new Date().toJSON()} - systemAction : resetCrontab : Set the root crontab `);

                    exec(`cat ${HOME}/Docker_scripts/soulConfig/docker_root_crontab | sudo crontab -`, (err) => {
                        if (!err) {
                            mqttWrite("systemAction/responseAction", {
                                data: { systemActionFlag: true },
                                communicationId: iMessage.communicationId
                            });
                        } else {
                            mqttWrite("systemAction/responseAction", {
                                data: { systemActionFlag: false },
                                communicationId: iMessage.communicationId
                            });
                        }
                    })

                } else if (iMessage.data.crontabType == 'user') {
                    console.log(`${new Date().toJSON()} - systemAction : resetCrontab : Set the user crontab  No user crontab for the Docker`);
                }
            }
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : resetCrontab : Exception occured !!`);
        console.log(error);
    }
}
const arrtoObjet = (array) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : listNetwork : arrtoObjet : In the function  : ${networkCommunicationId}`);
        let obj = {};
        for (let a = 0; a < array.length; a++) {
            array[a] = array[a].split("  ").join("");
            let i = array[a].indexOf(':');
            let partOne = array[a].slice(0, i).trim();
            let partTwo = array[a].slice(i + 1, array[a].length).trim();
            if (partOne == 'GENERAL.DEVICE' && partTwo == 'lo') {
                return;
            }
            obj[partOne] = partTwo;
            if (a == array.length - 1) {
                console.log(`${new Date().toJSON()} - last index`);
                console.log(obj);
                console.log(obj["GENERAL.DEVICE"]);
                console.log(obj["IP4.ADDRESS[1]"]);
                if (obj["IP4.ADDRESS[1]"] && obj["IP4.ADDRESS[1]"].includes('/') && obj["GENERAL.TYPE"] && obj["GENERAL.TYPE"] != "bridge") {
                    console.log(`${new Date().toJSON()} <------Any one of the values is present on hub`);
                    let ip1, gateway, dns, mask;
                    gateway = dns = mask = "NA";
                    ip1 = obj["IP4.ADDRESS[1]"];
                    console.log(`${new Date().toJSON()} - hub ip ${ip1}`);
                    if (ip1 && ip1.includes('/')) {
                        console.log("yes it includes /");
                        ip1 = ip1.slice(0, ip1.indexOf('/'));
                        mask = obj["IP4.ADDRESS[1]"].slice(obj["IP4.ADDRESS[1]"].indexOf('/') + 1);
                        gateway = obj["IP4.GATEWAY"];
                        dns = obj["IP4.DNS[1]"] ? obj["IP4.DNS[1]"] : obj["IP4.GATEWAY"];
                        console.log("so ip is....", ip1);
                    } else {
                        console.log(`${new Date().toJSON()} - no it doesnt`);
                        ip1 = "NA";
                    }
                    let networkObject = {
                        data: {
                            "CML_SUB_TYPE": obj["GENERAL.DEVICE"],
                            "CML_TYPE": obj["GENERAL.TYPE"],
                            "CML_IP": ip1,
                            "CML_GATEWAY_IP": gateway,
                            "CML_MAC_ID": obj["GENERAL.HWADDR"],
                            "CML_NETMASK": mask,
                            "CML_DNS": dns,
                            "CML_MODE": "DHCP",
                            "entity_type": 'network',
                            "bluetoothAddress": exec(`hcitool dev|grep hci0|awk '{print $2}'`).trim(),
                            "CML_SSID": obj["GENERAL.CONNECTION"] == "--" ? "NA" : obj["GENERAL.CONNECTION"],
                            "CML_STATE": (obj["GENERAL.STATE"] == "100 (connected)") ? "Connected" : "Disconnected",
                            "CML_FREQUENCY": "NA",
                            "CML_SIGNAL_STRENGTH": "NA"
                        },
                        communicationId: networkCommunicationId
                    }
                    //send to sysetmContainer details and add the networkinfo for the hub;
                    console.log(`${new Date().toJSON()} - Network  objectttttttt to be send---------> : ${JSON.stringify(networkObject)}`);
                    mqttWrite("systemAction/responseAction", networkObject)
                }
            }
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : arrtoObjet : Exception occured !!`);
        console.log(error);
    }
}
const getAllIndexes = (arr, val) => {
    try {
        let indexes = [],
            i;
        for (i = 0; i < arr.length; i++)
            if (arr[i] === val)
                indexes.push(i);
        return indexes;
    } catch (err) {
        console.log(`${new Date().toJSON()} - systemAction : networkInfo :  getAllIndexes : Exception occured !!`);
    }
}

const listNetwork = () => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : listNetwork : In the function !!!!!!!!!!!!!!!!!!!!!!! : ${networkCommunicationId}`);
        exec(`nmcli device show`, (err, stdout, stderr) => {
            if (err) {
                console.log(`${new Date().toJSON()} - Error in exec ${err}`);
                let networkObject = {
                    data: {
                        "CML_MODE": "DHCP",
                        "entity_type": 'network',
                        "bluetoothAddress": '',
                        "CML_FREQUENCY": "NA",
                        "CML_SIGNAL_STRENGTH": "NA"
                    },
                    communicationId: networkCommunicationId
                }
                console.log(`${new Date().toJSON()} - Error in exec ${err}`);
                let netData = os.networkInterfaces();
                let interfaces = Object.keys(os.networkInterfaces());
                console.log(`${new Date().toJSON()} - network - element - interfaces ${interfaces}`)
                interfaces.forEach(function (element, id, arr) {
                    console.log(`${new Date().toJSON()} - network element ${element}`)
                    let gateway = exec(`ip route show default | awk '/default/ {print $3}'`).trim()
                    let dns = exec(`grep -E '^nameserver' /etc/resolv.conf | awk '{print $2}'`).trim()
                    networkObject.data['CML_GATEWAY_IP'] = gateway
                    networkObject.data['CML_DNS'] = dns
                    if (element != 'lo') {
                        if (element && element.charAt(0) == 'w' && netData && netData[element] && netData[element].length > 0 && netData[element][0].hasOwnProperty("mac") && netData[element][0].hasOwnProperty("address")) {
                            networkObject.data['CML_SUB_TYPE'] = element
                            networkObject.data['CML_TYPE'] = 'wifi'
                            let ssid = exec(`sudo iwconfig ${element} | grep ESSID | awk -F: '{print $2}' | tr -d '"'`).trim();
                            let netmask = exec(`ip addr show ${element} | awk '/inet / {print $2}' | cut -d '/' -f 2`).trim()
                            networkObject.data['CML_NETMASK'] = netmask;
                            networkObject.data['CML_SSID'] = ssid;
                            networkObject.data['CML_IP'] = netData[element][0].address ? netData[element][0].address : ''
                            networkObject.data['CML_MAC_ID'] = netData[element][0].mac.toLocaleUpperCase() ? netData[element][0].mac.toLocaleUpperCase() : '';
                            networkObject.data['CML_STATE'] = netData[element][0].address ? "Connected" : "Disconnected"
                        }
                        if (element && element.charAt(0) == 'e' && netData && netData[element] && netData[element].length > 0 && netData[element][0].hasOwnProperty("mac") && netData[element][0].hasOwnProperty("address")) {
                            networkObject.data['CML_SUB_TYPE'] = element
                            networkObject.data['CML_TYPE'] = 'ethernet'
                            let ssid = exec(`sudo iwconfig ${element} | grep ESSID | awk -F: '{print $2}' | tr -d '"'`).trim();
                            let netmask = exec(`ip addr show ${element} | awk '/inet / {print $2}' | cut -d '/' -f 2`).trim()
                            networkObject.data['CML_NETMASK'] = netmask;
                            networkObject.data['CML_SSID'] = ssid;
                            networkObject.data['CML_IP'] = netData[element][0].address ? netData[element][0].address : ''
                            networkObject.data['CML_MAC_ID'] = netData[element][0].mac.toLocaleUpperCase() ? netData[element][0].mac.toLocaleUpperCase() : '';
                            networkObject.data['CML_STATE'] = netData[element][0].address ? "Connected" : "Disconnected"
                        }
                    }
                });
                console.log(`${new Date().toJSON()} - Network  objectttttttt in err case - to be send---------> : ${JSON.stringify(networkObject)}`);
                mqttWrite("systemAction/responseAction", networkObject)
            } else {
                console.log(`${new Date().toJSON()} - in exec`);
                let out = stdout;
                let arr = out.split("\n");
                console.log(`${new Date().toJSON()} - out....`, arr);
                const mainarr = arr;
                let Whitespace = getAllIndexes(arr, "");

                for (let k = 0; k < Whitespace.length; k++) {
                    if (k == 0) {
                        arrtoObjet(arr.slice(0, Whitespace[k]));
                    } else {
                        let a = Whitespace[k - 1];
                        if (Whitespace[k + 1]) {
                            arrtoObjet(mainarr.slice(a + 1, Whitespace[k]));
                        } else {
                            arrtoObjet(mainarr.slice(Whitespace[k - 1] + 1, Whitespace[k]));
                        }
                    }
                }
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : listNetwork : Exception occured !!`);
        console.log(error);
    }
}

const getNetworkDetails = (iMessage) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : geneartesshKeys : In the function authKey : ${iMessage.data.authKey}`);
        if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey) {
            console.log(`${new Date().toJSON()} -  <-----systemAction : iMessage.data.communicationId : ${networkCommunicationId} - `)
            listNetwork();
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : getNetworkDetails : Exception occured !!`);
        console.log(error);
    }
}
const ExecuteUpdates = (taskSeries, ServerTypeObj, iMessage) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : ExecuteUpdates : In the function `);
        async.series(taskSeries, (err, results) => {
            if (err) {
                console.log(`${new Date().toJSON()} - err : ExecuteUpdates : ${err}`);
                console.log(`${new Date().toJSON()} - ExecuteUpdates : resulting array : ${JSON.stringify(results)}`);
                let Init_fware = properties.stringify({ "module": ServerTypeObj.module, "dependancy": ServerTypeObj.dependancy, "sound": ServerTypeObj.sound, "soulhub": ServerTypeObj.soulhub, "portal": ServerTypeObj.portal, "soulsystem": ServerTypeObj.soulsystem, "pyprocess": ServerTypeObj.pyprocess, "souldapi": ServerTypeObj.souldapi });
                fs.writeFileSync(`${HOME}/db/firmware.properties`, "[firmware]\n" + Init_fware);
                if (fs.existsSync(`${HOME}/db/replacehub.properties`)) {
                    fs.unlink(`${HOME}/db/replacehub.properties`, (err2) => {
                        if (err2)
                            console.log(`${new Date().toJSON()} - err : ExecuteUpdates : ${err2}`);
                        else
                            console.log(`${new Date().toJSON()} - ExecuteUpdates : replacehub.properties file deleted successfully}`);
                    });
                }

                rebootAfterUpdate()
            }
            if (updated) {
                let date = new Date();
                async.series([
                    function (callback) {
                        console.log(`${new Date().toJSON()} - emitting socket`);
                        console.log(`${new Date().toJSON()} - Emitting this to F.E : `);
                        callback(null);
                    },
                    function (callback) {
                        console.log(`${new Date().toJSON()} - ServerTypeObj : ServerTypeObjServerTypeObj : ${JSON.stringify(ServerTypeObj)}`);
                        console.log(`${new Date().toJSON()} - Everything is up-to-date, restarting...`);
                        let Init_fware = properties.stringify({ "module": ServerTypeObj.module, "dependancy": ServerTypeObj.dependancy, "sound": ServerTypeObj.sound, "soulhub": ServerTypeObj.soulhub, "portal": ServerTypeObj.portal, "soulsystem": ServerTypeObj.soulsystem, "pyprocess": ServerTypeObj.pyprocess, "souldapi": ServerTypeObj.souldapi });
                        fs.writeFileSync(`${HOME}/db/firmware.properties`, "[firmware]\n" + Init_fware);
                        callback(null);
                    }
                ],
                    function (err1, result) {
                        console.log(`${new Date().toJSON()} - All updated : `);
                        fs.writeFileSync(`${HOME}/db/lastupdate`, date.toJSON());
                        /**                            
                         * Topic to check for the DAPI updates
                         */
                        rebootAfterUpdate()
                    });
            }
        });
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : ExecuteUpdates : Exception occured!!!!!!`);
        console.log(error);
    }
}

const rebootAfterUpdate = () => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : rebootAfterUpdate : Rebooting hub after taking updates :`);
        if (fs.existsSync(`${HOME}db/hdf_count.json`)) {
            console.log(`${new Date().toJSON()} ---DELETE: : : file exists`);
            console.log(`${new Date().toJSON()} ----DELETE FILE WHOSE NAME IS : ${HOME}db/hdf_count.json`);
            fs.unlinkSync(HOME + 'db/hdf_count.json');
            console.log(`${new Date().toJSON()} ----- FILE DELETED NAME IS : ${HOME}db/hdf_count.json`);
        }
        setTimeout(() => {
            let obj = JSON.stringify({ action: "Update hub-sudo reboot-SoulSystem", Path: process.env.PWD, Timestamp: new Date().toJSON(), User: process.env.USER })
            exec(`echo ${obj} >> ${HOME}/logs/core/reboot.log`);
            exec(`sudo reboot`);
        }, 7000);
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : rebootAfterUpdate : Exception occured!!!!!!`);
        console.log(error); 
    }
}

const download = (path, moduleName, cb) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : download : In the function :`);
        console.log(`${new Date().toJSON()} - systemAction : moduleName ${moduleName}`);
        console.log(`${new Date().toJSON()} - download : path ${path}`);
        let critResponseObj = {
            communicationId: new Date().getTime() + 'firmwarecriticalwarning' + crypto.randomBytes(1).toJSON().data[0],
            data: {
                type: "firmware",
                name: moduleName
            }
        }
        if (moduleName && moduleName.includes("sound")) {
            console.log(`${new Date().toJSON()} - Release is for sound check for sound relase`);
            let soundPath = path.split('/')[1]//.split("-")
            let str = JSON.stringify(soundPath);
            let result = str.substring(7, str.indexOf("-arm64"));
            let hubos = soundPath.split("-")
            // let soundPath = path.split('/')[1].split("-")
            soundPath = `${server}/V2HUB/DOCKER/${hubType.toUpperCase()}/${hubSub.toUpperCase()}/${hubos[hubos.length - 2].toUpperCase()}/SOUND/${result}.tar.gz`
            //soundPath = `${server}/V2HUB/DOCKER/${hubType.toUpperCase()}/${hubSub.toUpperCase()}/${soundPath[4].toUpperCase()}/SOUND/${soundPath[0].split(':')[1]}-${soundPath[1]}.tar.gz`
            console.log(`${new Date().toJSON()} - SoundPathsoundPathsoundPath :  ${soundPath}`);

            progress(request({ url: `${soundPath}` }))
                .on('error', (err) => {
                    mqttWrite("systemAction/responseAction", networkObject)
                    mqttWrite("soulSystem/warning/downloadfail", critResponseObj);
                    cb(err);
                }).on('progress', function (state) {
                    console.log(`${new Date().toJSON()} -  systemAction - download - progress - percent:${Math.round(state.percent * 100)} label:   -  -  -  -  - `);
                })
                .on('end', () => {
                    sendPercentage('download', 100, moduleName + " downloaded images removed successFully", moduleName)
                    exec(`
				                     sudo rm -f /var/lib/docker/volumes/sounds/_data/*
				                     tar -xf /home/linaro/sounds.tar.gz -C /var/lib/docker/volumes/sounds/_data
                                     chown -R ${OWNER}:${GROUP} /var/lib/docker/volumes/sounds/_data 
                                     sudo rm -f /home/linaro/sounds.tar.gz`, cb);

                })
                .pipe(fs.createWriteStream(`${HOME}/sounds.tar.gz`));

        } 
        else if (moduleName && moduleName.includes("module") || (moduleName && moduleName.includes('dependancy'))) {
            console.log('this module do not have images to pull.');
            console.log('inside else if condition');
            cb()
        } else {
            let deploymentType = lastUpdatedHubType['hubDeploymentType'] ? lastUpdatedHubType['hubDeploymentType'] : getDeploymentType();
            if(moduleName && moduleName.includes("pyprocess") && deploymentType == "m"){
                console.log(`${new Date().toJSON()} - Release is for pyprocess `);
                let pythonFolderPath = path.split('/')[1]//.split("-")
                let str = JSON.stringify(pythonFolderPath);
                let result = str.substring(7, str.indexOf("-arm64"));
                let hubos = pythonFolderPath.split("-")
                // let soundPath = path.split('/')[1].split("-")
                pythonFolderPath = "https://modus.clouzer.com/V2HUB/V2_SETUP/APF.zip"
                //soundPath = `${server}/V2HUB/DOCKER/${hubType.toUpperCase()}/${hubSub.toUpperCase()}/${soundPath[4].toUpperCase()}/SOUND/${soundPath[0].split(':')[1]}-${soundPath[1]}.tar.gz`
                console.log(`${new Date().toJSON()} - SoundPathsoundPathsoundPath :  ${pythonFolderPath}`);
    
                progress(request({ url: `${pythonFolderPath}` }))
                    .on('error', (err) => {
                        mqttWrite("systemAction/responseAction", networkObject)
                        mqttWrite("soulSystem/warning/downloadfail", critResponseObj);
                     //   cb(err);
                    }).on('progress', function (state) {
                        console.log(`${new Date().toJSON()} -  systemAction - download - progress for python folder - percent:${Math.round(state.percent * 100)} label:   -  -  -  -  - `);
                    })
                    .on('end', () => {
                        sendPercentage('download', 100, moduleName + " downloaded images removed successFully", moduleName)
                        exec(`
                                         sudo rm -rf /home/linaro/APF
                                         unzip /home/linaro/APF.zip -d /home/linaro
                                         chown -R ${OWNER}:${GROUP} /home/linaro/APF
                                         sudo rm -f /home/linaro/APF.zip`, ()=>{
                                            console.log(`${new Date().toJSON()} - APF created successsfully`)
                                         });
    
                    })
                    .pipe(fs.createWriteStream(`${HOME}/APF.zip`));
            }
            let registryUrl = getRegistryUrl()
            function pullImage() {
                exec(` sudo docker pull ${path}`, (err) => {
                    if (!err) {
                        sendPercentage('download', 20, moduleName + " images downloaded successfully", moduleName)
                        console.log(`${new Date().toJSON()} - Image pull successFull : `);
                        exec(` sudo docker ps -a | grep ${moduleName}`, (err1) => {
                            if (!err1) {
                                exec(` sudo docker rm -f ${moduleName}`, (err2) => {
                                    if (!err2) {
                                        sendPercentage('download', 40, moduleName + " process stoped", moduleName)
                                        console.log(`${new Date().toJSON()} - Stop the running container : successFully`);
                                        exec(`sudo docker rmi ${moduleName} `, (err3) => {
                                            if (!err3) {
                                                sendPercentage('download', 60, moduleName + " old docker images removed successFully", moduleName)
                                                console.log(`${new Date().toJSON()} - Old docker images removed successFully`);
                                                exec(`sudo docker tag ${path} ${moduleName}`, (err4) => {
                                                    if (!err4) {
                                                        sendPercentage('download', 80, moduleName + " docker images tagged succeeFully", moduleName)
                                                        console.log(`${new Date().toJSON()} - Docker images tagged succeeFully`);
                                                        exec(`sudo docker rmi ${path} `, (err5) => {
                                                            if (!err5) {
                                                                sendPercentage('download', 100, moduleName + " downloaded images removed successFully", moduleName)
                                                                console.log(`${new Date().toJSON()} - Downloaded images removed successFully`);
                                                                cb();
                                                            } else {
                                                                console.log(`${new Date().toJSON()} - Err : while removing  the new image ${path}`);
                                                                cb();
                                                            }
                                                        });
                                                    } else {
                                                        console.log(`${new Date().toJSON()} - Err : while tagging  the new image ${moduleName} error: ${err4}`);
                                                        mqttWrite("soulSystem/warning/downloadfail", critResponseObj);
                                                        cb(err4);
                                                    }
                                                });
                                            } else {
                                                console.log(`${new Date().toJSON()} - Err : while removing the old image ${moduleName} : error :${err3}`);
                                                exec(`sudo docker tag ${path} ${moduleName}`, (err4) => {
                                                    if (!err4) {
                                                        sendPercentage('download', 80, moduleName + " docker images tagged succeeFully", moduleName)
                                                        console.log(`${new Date().toJSON()} - Docker images tagged succeeFully`);
                                                        exec(`sudo docker rmi ${path} `, (err5) => {
                                                            if (!err5) {
                                                                sendPercentage('download', 100, moduleName + " downloaded images removed successFully", moduleName)
                                                                console.log(`${new Date().toJSON()} - Downloaded images removed successFully`);
                                                                cb();
                                                            } else {
                                                                console.log(`${new Date().toJSON()} - Err : while removing  the new image ${path}`);
                                                                cb();
                                                            }
                                                        });
                                                    } else {
                                                        console.log(`${new Date().toJSON()} - Err : while tagging  the new image ${moduleName} error : ${err4}`);
                                                        mqttWrite("soulSystem/warning/downloadfail", critResponseObj);
                                                        cb(err4);
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        console.log(`${new Date().toJSON()} - Err : while stopping image ${path}`);
                                        exec(`sudo docker rmi ${moduleName} `, (err3) => {
                                            if (!err3) {
                                                sendPercentage('download', 60, moduleName + " old docker images removed successFully", moduleName)
                                                console.log(`${new Date().toJSON()} - Old docker images removed successFully`);
                                                exec(`sudo docker tag ${path} ${moduleName}`, (err4) => {
                                                    if (!err4) {
                                                        sendPercentage('download', 80, moduleName + " docker images tagged succeeFully", moduleName)
                                                        console.log(`${new Date().toJSON()} - Docker images tagged succeeFully`);
                                                        exec(`sudo docker rmi ${path} `, (err5) => {
                                                            if (!err5) {
                                                                sendPercentage('download', 100, moduleName + " downloaded images removed successFully", moduleName)
                                                                console.log(`${new Date().toJSON()} - Downloaded images removed successFully`);
                                                                cb();
                                                            } else {
                                                                console.log(`${new Date().toJSON()} - Err : while removing  the new image ${path}`);
                                                                cb();
                                                            }
                                                        });
                                                    } else {
                                                        console.log(`${new Date().toJSON()} - Err : while tagging  the new image ${moduleName} error : ${err4}`);
                                                        mqttWrite("soulSystem/warning/downloadfail", critResponseObj);
                                                        cb(err4);
                                                    }
                                                });
                                            } else {
                                                console.log(`${new Date().toJSON()} - Err : while removing the old image ${moduleName} error: ${err3}`);
                                                exec(`sudo docker tag ${path} ${moduleName}`, (err4) => {
                                                    if (!err4) {
                                                        sendPercentage('download', 80, moduleName + " docker images tagged succeeFully", moduleName)
                                                        console.log(`${new Date().toJSON()} - Docker images tagged succeeFully`);
                                                        exec(`sudo docker rmi ${path} `, (err5) => {
                                                            if (!err5) {
                                                                sendPercentage('download', 100, moduleName + " downloaded images removed successFully", moduleName)
                                                                console.log(`${new Date().toJSON()} - Downloaded images removed successFully`);
                                                                cb();
                                                            } else {
                                                                console.log(`${new Date().toJSON()} - Err : while removing  the new image ${path}`);
                                                                cb();
                                                            }
                                                        });
                                                    } else {
                                                        console.log(`${new Date().toJSON()} - Err : while tagging  the new image ${moduleName} error : ${err4}`);
                                                        mqttWrite("soulSystem/warning/downloadfail", critResponseObj);
                                                        cb(err4);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                console.log(`${new Date().toJSON()} - Container not in running mode and not yet started`);
                                exec(`sudo docker tag ${path} ${moduleName}`, (err6) => {
                                    if (!err6) {
                                        sendPercentage('download', 80, moduleName + " docker images tagged succeeFully", moduleName)
                                        console.log(`${new Date().toJSON()} - Docker images tagged succeeFully`);
                                        exec(`sudo docker rmi ${path} `, (err7) => {
                                            if (!err7) {
                                                sendPercentage('download', 100, moduleName + " downloaded images removed successFully", moduleName)
                                                console.log(`${new Date().toJSON()} - Downloaded images removed successFully`);
                                                cb();
                                            } else {
                                                console.log(`${new Date().toJSON()} - Err : while removing  the new image ${path}`);
                                                cb();
                                            }
                                        });
                                    }
                                });
                            }
                        });

                    } else {
                        console.log(`${new Date().toJSON()} - Err : Pulling  images : ${err}`);
                        mqttWrite("soulSystem/warning/downloadfail", critResponseObj);
                        cb(err);
                    }
                });
            }
            fs.readFile("/root/.docker/config.json", function (err, data) {
                if (err) {
                    console.log(err);
                    exec(`echo "admin@123"| sudo docker login --username cloudadmin --password-stdin  ${registryUrl}`, (error) => {
                        if (!error) {
                            sendPercentage('download', 1, "downloading images " + moduleName, moduleName)
                            pullImage()
                        } else {
                            console.log(`${new Date().toJSON()} - Error during athentication ${error}`);
                            mqttWrite("soulSystem/warning/downloadfail", critResponseObj);
                            cb(error);
                        }
                    });
                } else if (data.indexOf(registryUrl) >= 0) {
                    console.log(`${new Date().toJSON()} - docker is alredy logged in`) //Do Things
                    pullImage();
                }
                else {
                    exec(`echo "admin@123"| sudo docker login --username cloudadmin --password-stdin  ${registryUrl}`, (error) => {
                        if (!error) {
                            sendPercentage('download', 1, "downloading images " + moduleName, moduleName)
                            pullImage()
                        } else {
                            console.log(`${new Date().toJSON()} - Error during athentication ${error}`);
                            mqttWrite("soulSystem/warning/downloadfail", critResponseObj);
                            cb(error);
                        }
                    })
                }
            });
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - Error while downloading the images`);
        console.log(error)
    }
}
const upDateHub = (iMessage) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : message : ${iMessage}`);
        console.log(`${new Date().toJSON()} - systemAction : message : typpppppppppp ${typeof iMessage}`);

        let getHubGen = process.env.CML_GENERATION;
        if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey) {
            let ServerTypeObj = iMessage.data.ServerTypeObj
            let FIRMWARE = iMessage.data.hubPresentFirmware
            console.log(`${new Date().toJSON()} - systemAction : In the function : upDateHub : ${ServerTypeObj}`);
            FIRMWARE['weeklydb'] = FIRMWARE.soulsystem;
            FIRMWARE['udpserver'] = FIRMWARE.soulsystem;
            FIRMWARE['startstandalone'] = FIRMWARE.soulsystem;
            FIRMWARE['diagnostic'] = FIRMWARE.soulsystem;
            console.log(`${new Date().toJSON()} - <------------FIRMWARE : ${FIRMWARE}`);
            ServerTypeObj['weeklydb'] = ServerTypeObj.soulsystem;
            ServerTypeObj['udpserver'] = ServerTypeObj.soulsystem;
            ServerTypeObj['startstandalone'] = ServerTypeObj.soulsystem;
            ServerTypeObj['diagnostic'] = ServerTypeObj.soulsystem;

            console.log(`${new Date().toJSON()} - systemAction : In the function : upDateHub : After assignment ${JSON.stringify(ServerTypeObj)}`);
            console.log(`${new Date().toJSON()} - In the call back function to return the object : : : ${JSON.stringify(FIRMWARE)}`)
            let updatedProcessArr = []
            const taskSeries = Object.keys(ServerTypeObj).map((type, index) => {
                return (cb) => {
                    console.log(`${new Date().toJSON()} - checking updates for ${type}`);
                    try {
                        let _validLocal = semver.valid(FIRMWARE[type]);
                        let _validServer = semver.valid(ServerTypeObj[type]);
                        console.log(`${new Date().toJSON()} - _validServer_validServer : ${_validServer}`);
                        if (_validLocal == null) {
                            FIRMWARE[type] = '0.0.0'
                        }
                        if (_validServer == null) {
                            ServerTypeObj[type] = '0.0.1'
                        }
                        if (semver.gt(ServerTypeObj[type], FIRMWARE[type])) {
                            console.log(`${new Date().toJSON()} - Install version execute the version is greater than execeeding one`);
                            updated = true;
                            let path;
                            path = ServerTypeObj[type];
                            if (getHubGen == "V2") {
                                console.log(`${new Date().toJSON()} - In update-checker HUB_SUBSCRIPTION is Basic `);
                                let serverName = server.includes("www.clouzer.com") ? "prod" : server.split('.')[0].split('//')[1];
                                let registryUrl = getRegistryUrl()
                                path = registryUrl + "/" + type + ":" + path + "-" + exec(`dpkg --print-architecture`).trim() + "-" + hubType + "-" + exec(`lsb_release -d | awk '{print " "$2}'`).trim() + "-" + serverName;
                                console.log(`${new Date().toJSON()} - Completeeeeeeeeee path ${path}`);
                            }

                            console.log(`${new Date().toJSON()} - call to the download function - - - `);
                            download(path, type, (err) => {
                                if (err) {
                                    ServerTypeObj[type] = getFirmwareVersions()[type];
                                    if (iMessage.data.fixedVersionArray && iMessage.data.fixedVersionArray.length > 0 && iMessage.data.fixedVersionArray.includes(type)) {
                                        console.log(`${new Date().toJSON()} - systemAction - fixedVersionArray case - error : ${err}`);
                                        let obj = {
                                            data: { systemActionFlag: false, type: type },
                                            communicationId: iMessage.communicationId
                                        }
                                        obj[type] = false;
                                        mqttWrite("systemAction/responseAction", obj);
                                        iMessage.data.fixedVersionArray.splice(iMessage.data.fixedVersionArray.indexOf(type), 1)
                                    } else {
                                        console.log(`${new Date().toJSON()} -systemAction -  upDateHub - error occured ${err}`);
                                        let obj = {
                                            data: { systemActionFlag: false, type: type },
                                            communicationId: iMessage.communicationId
                                        }
                                        obj[type] = false;
                                        mqttWrite("systemAction/responseAction", obj);
                                    }
                                    cb(null)
                                } else {
                                    if (iMessage.data.fixedVersionArray && iMessage.data.fixedVersionArray.length > 0 && iMessage.data.fixedVersionArray.includes(type)) {
                                        console.log(`${new Date().toJSON()} - systemAction - fixedVersionArray case - success`);
                                        let obj = {
                                            data: { systemActionFlag: true, type: type },
                                            communicationId: iMessage.communicationId
                                        }
                                        obj[type] = true;
                                        mqttWrite("systemAction/responseAction", obj);
                                        iMessage.data.fixedVersionArray.splice(iMessage.data.fixedVersionArray.indexOf(type), 1)
                                    } else {
                                        console.log(`${new Date().toJSON()} - systemAction - upDateHub - success`);
                                        let obj = {
                                            data: { systemActionFlag: true, type: type },
                                            communicationId: iMessage.communicationId
                                        }
                                        obj[type] = true;
                                        mqttWrite("systemAction/responseAction", obj);
                                        updatedProcessArr.push(type)
                                    }
                                    cb(null);
                                }
                            });
                        } else {
                            console.log(`${new Date().toJSON()} - No update version is present for the next entry no need to take updates`);
                            ServerTypeObj[type] = FIRMWARE[type];
                            cb(null);
                        }
                        if (updatedProcessArr.length > 0 && index == Object.keys(ServerTypeObj).length - 1) {
                            console.log(`${new Date().toJSON()} - Hub is uptoDate`);
                            let obj = {
                                data: { systemActionFlag: true, updatedProcess: updatedProcessArr, updateDone: true },
                                communicationId: iMessage.communicationId
                            }
                            mqttWrite("systemAction/responseAction", obj);
                        }
                    } catch (err) {
                        console.log(`${new Date().toJSON()} - Exception occure comapre version`);
                        console.log(err);
                    }
                }
            });
            ExecuteUpdates(taskSeries, ServerTypeObj, iMessage);
        } else {
            console.log(`${new Date().toJSON()} - systemAction :  Update : Else  `);
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : Update : Exception occured !!`);
        console.log(error);
    }
}

const firmwareReset = (iMessage) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : firmwareReset : In the function  ${JSON.stringify(iMessage)}`);
        if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey) {
            let serverName = server.includes("www.clouzer.com") ? "prod" : server.split('.')[0].split('//')[1];
            let registryUrl = getRegistryUrl()
            if (iMessage.data.moduleToReset == "soulsystem") {
                let subProcessArr = ["soulsystem", "weeklydb", 'udpserver', 'startstandalone', 'diagnostic'];

                const resetTaskSeries = subProcessArr.map((module) => {
                    return (cb) => {
                        let path = registryUrl + "/" + module + ":" + iMessage.data.path + "-" + exec(`dpkg --print-architecture`).trim() + "-" + hubType + "-" + exec(`lsb_release -d | awk '{print " "$2}'`).trim() + "-" + serverName;
                        console.log(`${new Date().toJSON()} - firmwareReset : soulsystem firmware reset ${path}`);
                        download(path, module, (err) => {
                            if (!err) {
                                cb(null)
                            } else {
                                cb(err)
                                console.log(`${new Date().toJSON()} - firmwareReset  : exception occure while downloading the firmware reseted module`);
                            }
                        })
                    }
                })
                async.series(resetTaskSeries,
                    function (ierr) {
                        console.log(`${new Date().toJSON()} - firmwareReset  : firmware reset call back function`);
                        if (ierr) {
                            console.log(`${new Date().toJSON()} - firmwareReset  : exception occure while downloading the firmware reseted module`);
                            mqttWrite("systemAction/responseAction", {
                                data: { systemActionFlag: false },
                                communicationId: iMessage.communicationId
                            });
                        } else {
                            mqttWrite("systemAction/responseAction", {
                                data: { systemActionFlag: true },
                                communicationId: iMessage.communicationId
                            });
                            fs.writeFileSync(`${HOME}/db/lastFirmwareResetupdate`, new Date().toJSON());
                            //  firmware reset new changes
                            const data = fs.readFileSync(`${HOME}/db/lastFirmwareResetupdatetime.properties`, { encoding: 'utf8' });
                            const options = {
                                sections: true,
                                comments: '#',
                                separators: '=',
                                strict: true,
                            };
                            const result = properties.parse(data, options);
                            let lastFirmwareResetupdate = {};
                            console.log(`${new Date().toJSON()} - module to firmware reset ${iMessage.data.moduleToReset}`);
                            lastFirmwareResetupdate = result.firmwareResetTime;
                            lastFirmwareResetupdate[iMessage.data.moduleToReset.toLowerCase()] = new Date().toJSON();
                            let write_fwarereset = properties.stringify(lastFirmwareResetupdate);
                            fs.writeFileSync(`${HOME}/db/lastFirmwareResetupdatetime.properties`, "[firmwareResetTime]\n" + write_fwarereset);
                            let obj = JSON.stringify({ action: "firmware-reset-sudo reboot-SoulSystem", Path: process.env.PWD, Timestamp: new Date().toJSON(), User: process.env.USER })
                            exec(`echo ${obj} >> ${HOME}/logs/core/reboot.log`);
                            setTimeout(() => {
                                exec(`sudo reboot`);
                            }, 2000)
                        }
                    });
            } else {
                let path = registryUrl + "/" + iMessage.data.moduleToReset + ":" + iMessage.data.path + "-" + exec(`dpkg --print-architecture`).trim() + "-" + hubType + "-" + exec(`lsb_release -d | awk '{print " "$2}'`).trim() + "-" + serverName;
                console.log(`${new Date().toJSON()} - firmwareReset : Completeeeeeeeeee path ${path}`);
                download(path, iMessage.data.moduleToReset, (err) => {
                    if (!err) {
                        mqttWrite("systemAction/responseAction", {
                            data: { systemActionFlag: true },
                            communicationId: iMessage.communicationId
                        });
                        fs.writeFileSync(`${HOME}/db/lastFirmwareResetupdate`, new Date().toJSON());
                        //  firmware reset new changes
                        const data = fs.readFileSync(`${HOME}/db/lastFirmwareResetupdatetime.properties`, { encoding: 'utf8' });
                        const options = {
                            sections: true,
                            comments: '#',
                            separators: '=',
                            strict: true,
                        };
                        const result = properties.parse(data, options);
                        let lastFirmwareResetupdate = {};
                        console.log(`${new Date().toJSON()} - module to firmware reset ${iMessage.data.moduleToReset}`);
                        lastFirmwareResetupdate = result.firmwareResetTime;
                        lastFirmwareResetupdate[iMessage.data.moduleToReset.toLowerCase()] = new Date().toJSON();
                        let write_fwarereset = properties.stringify(lastFirmwareResetupdate);
                        fs.writeFileSync(`${HOME}/db/lastFirmwareResetupdatetime.properties`, "[firmwareResetTime]\n" + write_fwarereset);
                        let obj = JSON.stringify({ action: "firmware-reset-sudo reboot-SoulSystem", Path: process.env.PWD, Timestamp: new Date().toJSON(), User: process.env.USER })
                        exec(`echo ${obj} >> ${HOME}/logs/core/reboot.log`);
                        setTimeout(function () {
                            exec(`sudo reboot`);
                        }, 2000)
                    } else {
                        mqttWrite("systemAction/responseAction", {
                            data: { systemActionFlag: false },
                            communicationId: iMessage.communicationId
                        });
                        console.log(`${new Date().toJSON()} - firmwareReset  : exception occure while downloading the firmware reseted module`);
                    }
                })
            }
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : firmwareReset : Exception occured !!`);
        console.log(error);
    }
}

const remoteAccess = (iMessage) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction : remoteAccess : In the function ${iMessage}`);
        if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey) {
            const spawn = require('child_process').spawn
            let path;
            let arch = exec(`dpkg --print-architecture`).trim();
            if (platform == 'linux') {
                console.log(`${new Date().toJSON()} - systemAction : remoteAccess platform checked linux`);
                if (arch == 'arm64') {
                    console.log(`${new Date().toJSON()} - systemAction : remoteAccess : arch arm64`);
                    path = "/home/linaro/node-v10.1.0-linux-arm64/bin/node"
                } else if (arch == 'amd64') {
                    console.log(`${new Date().toJSON()} - systemAction : remoteAccess : amd64`);
                    path = "/home/linaro/node-v10.1.0-linux-x64/bin/node"
                }
                //spawn(path, [`${HOME}` + `/serverShh.js`, iMessage.data.port])
                exec(`${path} ${HOME}serverShh.js ${iMessage.data.port} >> ${HOME}logs/core/serverShh.log 2>&1`, (err) => {
                    console.log(`${new Date().toJSON()} - error in remote accessssssssssss ${err}`)
                });
                mqttWrite("systemAction/responseAction", {
                    data: { systemActionFlag: true },
                    communicationId: iMessage.communicationId
                });
            } else if (platform == 'darwin') {
                console.log(`${new Date().toJSON()} - systemAction : remoteAccess : platform darwin`);
                exec(`chmod 777 ${HOME}/serverShh`)
                ls = spawn(`${HOME}` + '/serverShh', [iMessage.data.port])
                mqttWrite("systemAction/responseAction", {
                    data: { systemActionFlag: true },
                    communicationId: iMessage.communicationId
                });
            }
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : firmwareReset : Exception occured !!`);
        console.log(error);
    }
}

const restartAllProcess = () => {
    try {
        console.log(`${new Date().toJSON()} - systemAction :in restartAllProcess`)
        exec(`chmod 777 ${HOME}/Docker_scripts/soulScripts/Start_dockerContainer.sh && ${HOME}/Docker_scripts/soulScripts/Start_dockerContainer.sh`, (err) => {
            if (err) {
                console.log(err)
            } else {
                console.log(`${new Date().toJSON()} Start_dockerContainer excuted...`)
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction - restartAllProcess : error ${error}`)
    }
}


const restartsoulhubProcess = () => {
    try {
        console.log(`${new Date().toJSON()} - systemAction - in restartsoulhubProcess`)
        exec(`chmod 777 ${HOME}/Docker_scripts/soulScripts/restartSoulHub.sh && ${HOME}/Docker_scripts/soulScripts/restartSoulHub.sh`, (err) => {
            if (err) {
                console.log(err)
            } else {
                console.log('soulsystem - systemActions - restartsoulhubProcess - soulhub restarted successfully - - ')
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction - restartsoulhubProcess : error ${error}`)
    }
}

const remoteServiceOld = (iMessage) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction - In the function : remoteServiceOld`);
        if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey) {
            exec(`sudo systemctl stop ssh  && sudo systemctl start ssh`, () => {
                mqttWrite("systemAction/responseAction", {
                    data: { systemActionFlag: true },
                    communicationId: iMessage.communicationId
                });
            })
        }

    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction - remoteServiceOld : Error ${error}`);
    }
}

const uploadLogs = (iMessage) => {
    try {
        console.log(`${new Date().toJSON()} -systemAction : uploadLogs : In the function ${iMessage}`);
        if (iMessage.hasOwnProperty('data') && iMessage.data.hasOwnProperty('authKey') && iMessage.data.authKey == mqtt_authkey) {
            let d = new Date();
            let _dateWithMonthAndYear = d.toISOString().slice(0, 10);
            filenameArr.push(_dateWithMonthAndYear + "_" + new Date().getTime() + "_" + serial + '_log.tar.gz');
            const uploadFunc = (file) => {
                exec(`
                cd ${HOME} 
                rm -rf demo.txt
                rm -rf *.tar.gz
                LogsDirSize=$(expr $(du -s ${HOME}pyIOT_logs/|awk '{print $1}') + $(du -s ${HOME}logs/|awk '{print $1}'))
                echo $LogsDirSize
                echo 'creating logs tar'
                if [ $LogsDirSize -lt 1736032 ];then
                echo 'create logs dir tar'
                cd ${HOME} && tar -cvzf ${file} logs/* pyIOT_logs/*
                else
                echo 'create logs files tar'
                for logfolder in logs pyIOT_logs
                do
                cd ${HOME}$logfolder
                a=$(ls -lt|awk '{print $9}'|tail -n+2)
                for i in $a
                do
                echo ${HOME}$logfolder/"$i" >> ${HOME}demo.txt 2>&1 
                size=$(du -s $i|awk '{print $1}')
                filesize=$(expr $filesize + $size)
                if [ $filesize -ge 1736032 ];then
                echo $filesize
                break
                fi
                done
                done
                cd ${HOME}
                cat ${HOME}demo.txt |xargs tar -cvzf ${file}
                fi
                `, (err) => {
                    if (err) {
                        console.log(`${new Date().toJSON()} - quickRequestOperation : uploadLogs - Exception - exce occure while Creating log tar ${err}`);
                    }
                    exec(`chown ${OWNER}:${GROUP} ${HOME}${file}`);
                    console.log(`${new Date().toJSON()} - quickRequestOperation : successfully created tar ${file}`);
                    let token = iMessage.data.token;

                    if (token) {
                        let formData = {
                            hubId: serial,
                            stream: fs.createReadStream(`${HOME}` + file),
                            name: file,
                            windowId: Math.floor(crypto.randomBytes(1).toJSON().data[0] * (10000 - 1)),
                            type: 'uploadHubLogs',
                            hubGeneration: "V2",
                            size: fs.statSync(`${HOME}` + file).size,
                            id: 'admin@cloudsmaintenance.clouzer.com'
                        };
                        let progress1 = 0;
                        console.log(`${new Date().toJSON()} - form data: ${JSON.stringify(formData)}`);
                        request.post({
                            url: `${server}/upload`,
                            formData: formData,
                            headers: {
                                "Authorization": token,
                                "ContentType": "application/gzip"
                            }
                        }, function (err2, response, body) {
                            if (response && response.hasOwnProperty("statusCode"))
                                console.log(`${new Date().toJSON()} - uploadLogs - Request response - log file upload status code: ${response.statusCode}`);
                            if (err2) {
                                console.log(`${new Date().toJSON()} - uploadLogs - Request error - Exception Error While uploading tar file`);
                                mqttWrite("systemAction/responseAction", {
                                    data: { systemActionFlag: false, errorFlag: true },
                                    communicationId: iMessage.communicationId
                                });
                            }
                            if (response && response.statusCode == 200) {
                                console.log(`${new Date().toJSON()} - uploadLogs - Request error - log file upload body: ${body}`);
                                let responseData = JSON.parse(body);
                                mqttWrite("systemAction/responseAction", {
                                    data: { systemActionFlag: true, file: file, filePath: responseData.uploadFiles[0].path, size: fs.statSync(`${HOME}` + file).size },
                                    communicationId: iMessage.communicationId
                                });
                            }
                            if (file) {
                                filenameArr.splice(0, 1)
                                if (filenameArr.length > 0) {
                                    uploadFunc(filenameArr[0])
                                }
                                console.log(`${new Date().toJSON()} - removing file : ${file}`)
                                exec(` rm ${HOME}/${file}`)
                                exec(` rm -rf ${HOME}/demo.txt`)
                            }
                        })
                            .on('error', (err1) => {
                                console.log(`${new Date().toJSON()} - systemAction - uploadLogs  progress error file#${file} -  -  -  -  - `);
                                console.log(`${new Date().toJSON()} - systemAction - uploadLogs  progress error obje#${err1} -  -  -  -  - `);
                            })
                            .on('data', function (chunk) {
                                progress1 += chunk.length;
                                let stats = fs.statSync(`${HOME}` + file).size;
                                let perc = parseInt((progress1 / stats) * 100);
                                sendPercentage('upload', perc, "uploading log file", 'log')
                                console.log(`${new Date().toJSON()} -  DarwinSystem - UpdateChecker - uploadLog - data progress percent file#${file} - ${perc} -  -  -  - `);
                            })
                            .on('end', () => {
                                sendPercentage('upload', 100, "uploading log file", 'log')
                                console.log(`${new Date().toJSON()} - DarwinSystem - UpdateChecker - uploadLog - data progress percent file#${file} - ${100} -  -  -  - `);
                            });
                    }
                });
            }
            if (filenameArr.length > 0 && filenameArr.length == 1) {
                uploadFunc(filenameArr[0])
            }
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : uploadlogs : Exception occured !! ${error}`);
    }
}

const updateDriver = (driverDataObj) => {
    try {
        let status = {}
        console.log(`${new Date().toJSON()} - systemAction updateDriver funtion ${driverDataObj}`)
        generatePath(driverDataObj, (path) => {
            status.CML_STANDARD_TITLE = driverDataObj.CML_STANDARD_TITLE
            status.driverName = driverDataObj.driverName
            status.ServerVersion = driverDataObj.ServerVersion
            status.CML_MANUFACTURER = driverDataObj.CML_MANUFACTURER;
            status.DRIVER_NAME = driverDataObj.DRIVER_NAME;
            status.CML_MANUFACTURER_ID = driverDataObj.CML_MANUFACTURER_ID;
            status.KEY_VAL = driverDataObj.KEY_VAL;
            status.orgId = driverDataObj.orgId;
            status.driverStatus = driverDataObj.driverStatus;
            status.hubVersion = driverDataObj.hubVersion;
            status.operation = driverDataObj.operation;
            status.communicationId = driverDataObj.communicationId;
            status.CML_TITLE = driverDataObj.CML_TITLE.toLowerCase();
            status.MODE_OF_AUTH = driverDataObj.MODE_OF_AUTH;
            status.TYPE_OF_AUTH = driverDataObj.TYPE_OF_AUTH;
            status.authRequired = driverDataObj.authRequired;
            status.URL_PROVIDER = driverDataObj.URL_PROVIDER;
            status.userId = driverDataObj.userId;
            status.CML_SHORT_NAME = driverDataObj.CML_SHORT_NAME;
            status.fromScript = driverDataObj.fromScript ? driverDataObj.fromScript : false;

            if (driverDataObj.hasOwnProperty("autoDriverDownload"))
                status.autoDriverDownload = driverDataObj.autoDriverDownload;
            // check hub memory before installing driver
            let drive = osu.drive;
            let osROMinfo = {};
            drive.info()
                .then(info => {
                    console.log(info)
                    osROMinfo['remainingRom'] = info.freeGb;
                    osROMinfo['totalRom'] = info.totalGb;
                    if (osROMinfo.remainingRom >= 1 && path != "") {
                        download(path, driverDataObj.driverName.toLowerCase(), (err) => {
                       // download(path, driverDataObj.CML_MANUFACTURER.trim().replaceAll(' ','_').toLowerCase(), (err) => {
                            if (err) {
                                console.log(err);
                                status.downloadStatus = 2
                                mqttWrite("systemAction/driverStatus", status)
                            } else {
                                // exec(`sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --name ${driverDataObj.driverName} --env driverName=${driverDataObj.driverName} --env base_ip=$(hostname -I | awk '{print $1}') --net=host --env broker_port="8886" --env ApplicationEnv="Docker" --env-file /etc/environment -itd -m 64M --cpuset-cpus="1" --cpu-shares=512 ${driverDataObj.driverName}`,(err) => {
                                //    if (!err) {
                                status.downloadStatus = 1;
                                status.driverStatus = 1;
                                mqttWrite("systemAction/driverStatus", status)
                                // }else{
                                //     status.driverStatus = 2;
                                //     status.downloadStatus = 1;
                                //     mqttWrite("systemAction/driverStatus", status)
                                // }
                                //  });
                            }
                        });
                    } else {
                        console.log(`${new Date().toJSON()} - systemAction throw download error as memory space is less than 1GB ${driverDataObj}`)
                        status.downloadStatus = 2
                        mqttWrite("systemAction/driverStatus", status)
                    }
                })
        });
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : Update : Exception occured !! `);
        console.log(error);
    }
}

const generatePath = (driverData, cb) => {
    try {
        if (server.includes("ncplscm.clouzerindia.com")) {
            server = "https://dev.clouzer.com";
        }
        let path = ""
        let serverName = server.includes("www.clouzer.com") ? "prod" : server.split('.')[0].split('//')[1];
        //let path = "hubrepo.clouzerindia.com:5443/" + driverData.driverName + ":" + driverData.ServerVersion + "-" + exec(`dpkg --print-architecture`).trim() + "-" + hubType + "-" + exec(`lsb_release -d | awk '{print " "$2}'`).trim() + "-" + serverName;
        //let path =  "hubrepo.clouzerindia.com:5443/"+driverData.driverName+":"+driverData.ServerVersion+"-arm64-"+driverData.CML_MANUFACTURER_ID+"-dev";
        if (driverData.hasOwnProperty("CML_MANUFACTURER_ID") && driverData.hasOwnProperty("driverName")) {
            console.log(typeof driverData.CML_MANUFACTURER_ID)
            let manFacturer = driverData.CML_MANUFACTURER_ID.split("#").join(".");
            let registryUrl = getRegistryUrlforDrivers()
            path = registryUrl + "/" + driverData.driverName + ":" + driverData.ServerVersion + "-" + exec(`dpkg --print-architecture`).trim() + "-" + driverData.CML_HUB_SUBSCRIPTION + "-" + manFacturer + "-" + serverName;
            cb(path)
        } else {
            console.log(`${new Date().toJSON()} - systemAction : generatePath : org id not present in driver object`);
            cb(path)
        }

    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : ExecuteUpdatesDriver : Exception occured!!!!!!`);
        console.log(error);
    }
}

const getFirmwareVersions = () => {
    try {
        const firmwareData = fs.readFileSync(`${HOME}/db/firmware.properties`, { encoding: 'utf8' });
        let firmwareVer = properties.parse(firmwareData, propOptions).firmware;
        firmwareVer['weeklydb'] = firmwareVer.soulsystem;
        firmwareVer['udpserver'] = firmwareVer.soulsystem;
        firmwareVer['startstandalone'] = firmwareVer.soulsystem;
        firmwareVer['diagnostic'] = firmwareVer.soulsystem;
        return firmwareVer;
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : getFirmwareVersions : Exception occured!!!!!!`);
        console.log(error);
    }
}

const checkAllHubImages = () => {
    try {
        let hubProcesses = ['soulhub', 'portal', 'sound', 'soulsystem', 'pyprocess', 'souldapi', 'weeklydb', 'udpserver', 'startstandalone', 'diagnostic']
        let processes = exec(`sudo docker images --format '{{.Repository}}'`).trim().replace(/\n/g, ' ').split(" ");
        console.log(`${new Date().toJSON()} - systemAction : checkAllHubImages : all images ${processes}`);
        let firmwareVer = getFirmwareVersions()
        async.each(hubProcesses, function (process, callback) {
            console.log(`${new Date().toJSON()} - deleting driver -  -  - ${process} -  -  - `);
            function downloadProcess() {
                let serverName = server.includes("www.clouzer.com") ? "prod" : server.split('.')[0].split('//')[1];
                let registryUrl = getRegistryUrl()
                let path = registryUrl + "/" + process + ":" + firmwareVer[process] + "-" + exec(`dpkg --print-architecture`).trim() + "-" + hubType + "-" + exec(`lsb_release -d | awk '{print " "$2}'`).trim() + "-" + serverName;
                download(path, process, (err) => {
                    if (err) {
                        console.log(err);
                        callback()
                    } else {
                        console.log("*********************");
                        callback()
                    }
                });
            }
            if (processes.includes(process)) {
                console.log(`${new Date().toJSON()} - systemAction : checkAllHubImages : No need to pull image ${process}`);
                callback()
            } else if (process == "sound") {
                fs.readdir(`${HOME}/sounds`, function (err, files) {
                    if (err) {
                        console.log(`${new Date().toJSON()} - error while reading sounds folder`)
                    } else {
                        if (!files.length) {
                            downloadProcess()
                        }
                    }
                });
            }
            else {
                downloadProcess()
            }
        }, function (ierr) {
            if (ierr) {
                console.log(`${new Date().toJSON()} - error while checking hub images`);
            } else {
                console.log(`${new Date().toJSON()} - all hub images pulled successfully`);
            }
        });
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : checkAllHubImages : Exception occured!!!!!!`);
        console.log(error);
    }
}

const removeUnwantedImages = (driverData, cb) => {
    try {
        let notToRemove = ["soulhub", "soulsystem", "udpserver", "diagnostic", "souldapi", "startstandalone", "portal", "weeklydb", "pyprocess"];
        exec(`sudo docker rmi -f $(sudo docker images -f "dangling=true" -q)`).trim();
        let idprocesses = exec(`sudo docker images --format '{{.Repository}}':'{{.Tag}}'`).trim().replace(/\n/g, ' ').split(" ");
        let processes = exec(`sudo docker images --format '{{.Repository}}'`).trim().replace(/\n/g, ' ').split(" ");
        console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : all images ${processes}`);
        async.each(processes, function (process, callback) {
            console.log(`${new Date().toJSON()} - deleting driver -  -  - ${process} -  -  - `);
            if ((driverData.hasOwnProperty("data") && driverData.data.keepDrivers && process.includes("driver")) || notToRemove.includes(process)) {
                console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : No need to delete image ${process}`);
                callback()
            } else {
                exec(` sudo docker ps -a | grep ${process}`, (err) => {
                    if (err) {
                        console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : error while checking container :${err}`);
                        callback()
                    } else {
                        console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : removing process ${idprocesses[processes.indexOf(process)]}`);
                        exec(` sudo docker rm -f ${idprocesses[processes.indexOf(process)]}`, (err1) => {
                            if (err1) {
                                console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : error while stopping process :${process} error:${err1}`);
                                callback();
                            } else {
                                console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : image removed ${process}`);
                                exec(` sudo docker rmi -f ${idprocesses[processes.indexOf(process)]}`, (err2) => {
                                    if (!err2) {
                                        console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : error while image process ${process} error: ${err2}`);
                                        callback();
                                    } else {
                                        console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : removing image process :${process} `);
                                        callback();
                                    }
                                });
                            }
                        });
                    }
                })
            }
        }, function (ierr) {
            if (ierr) {
                if (cb) {
                    cb()
                }
                mqttWrite("systemAction/responseAction", { communicationId: driverData.communicationId, data: { Error: true } })
                console.log(`${new Date().toJSON()} - error while removing process`);
            } else {
                if (cb) {
                    cb()
                }
                checkAllHubImages()
                console.log(`${new Date().toJSON()} - all unwanted images removed successfully`);
                mqttWrite("systemAction/responseAction", { communicationId: driverData.communicationId, data: { Error: false } })
            }
        });
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : Exception occured!!!!!!`);
        console.log(error);
    }
}

const deleteDriver = (driverData) => {
    try {
        if (driverData.data.hasOwnProperty("dataArray")) {
            async.each(driverData.data.dataArray, function (driver, callback) {
                let driverName = driver.CML_TITLE;
                console.log(`${new Date().toJSON()} - deleting driver -  -  - ${driver} -  -  - `);
                exec(` sudo docker ps -a | grep ${driverName}`, (err) => {
                    if (!err) {
                        exec(` sudo docker rm -f ${driverName}`, (err1) => {
                            if (!err1) {
                                console.log(`${new Date().toJSON()} - Stop the running driver : successFully`);
                                exec(`sudo docker rmi ${driverName} `, (err2) => {
                                    if (!err2) {
                                        console.log(`${new Date().toJSON()} - driver images removed successFully`);
                                        callback()
                                    } else {
                                        console.log(`${new Date().toJSON()} - Err : while removing the driver image ${driverName}`);
                                        callback()
                                    }
                                });
                            } else {
                                callback()
                            }
                        });
                    } else {
                        console.log(`${new Date().toJSON()} - driver not in running mode and not yet started`);
                        exec(`sudo docker rmi -f ${driverName} `, (err3) => {
                            if (!err3) {
                                console.log(`${new Date().toJSON()} - driver images removed successFully`);
                                callback()
                            } else {
                                console.log(`${new Date().toJSON()} - Err : while removing the driver image ${driverName}`);
                                callback()
                            }
                        });
                    }
                });
            }, function (err4) {
                if (err4) {
                    mqttWrite("soulDapi/driverDeleted", { communicationId: driverData.communicationId, data: { Error: true } })
                    console.log(`${new Date().toJSON()} - error while deleting driver`);
                } else {
                    console.log(`${new Date().toJSON()} - all drivers deleted successfully`);
                    mqttWrite("soulDapi/driverDeleted", { communicationId: driverData.communicationId, data: { Error: false } })
                }
            });
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : deleteDrivers : Exception occured!!!!!!`);
        console.log(error);
    }
}

const setWeeklyDbSchedule = (iObj) => {
    try {
        exec(` sudo docker rm -f ${process}`, (err) => {
            if (!err) {
                exec(`sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --name weeklydb --env base_ip=$(hostname -I | awk '{print $1}') --env broker_port="8886" --env -itd -m 128M --cpuset-cpus="1" --cpu-shares=512 weeklydb`, (err1) => {
                    if (!err1) {
                        console.log(`${new Date().toJSON()} - WeeklyDbSchedule executed successfully`);
                        mqttWrite("systemAction/responseAction", { communicationId: driverData.communicationId, data: { Error: false } })
                    } else {
                        console.log(`${new Date().toJSON()} - error while executing  WeeklyDbSchedule`);
                        mqttWrite("systemAction/responseAction", { communicationId: driverData.communicationId, data: { Error: false } })
                    }
                });
            } else {
                console.log(`${new Date().toJSON()} - systemAction : removeUnwantedImages : error while removing process ${process}`);
            }
        });
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : setWeeklyDbSchedule : Exception occured!!!!!!`);
        console.log(error);
    }
}

const deleteDbFiles = (iObj) => {
    try {
        let deleteFiles = ["propertyID.json", "hubState.json", "SECN", "PRIM", "CasetaConfig", "interface.json"]
        fs.readdir(`${HOME}/db`, (err, files) => {
            sendPercentage('hardreset', 50, "deleting db files", 'maintenanceaction')
            if (!err) {
                async.each(files, (file, cb) => {
                    console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - check db File ${file} -  -  -  -  - `);
                    if (deleteFiles.includes(file)) {
                        exec(`sudo rm -rf ${HOME}/db/${file}`, function (err1) {
                            if (!err1) {
                                console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - File deleted successFully -  -  - ${file} -  - `);
                                cb();
                            } else {
                                console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - error while deleting file -  -  - ${file} -  - `);
                                console.log(err1)
                                cb(err1);
                            }
                        })
                    } else {
                        cb();
                    }
                }, (err2) => {
                    console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - all files deleted now -  -  -  -  - `);
                    if (!err2) {
                        // let existsSystemToken = fs.existsSync(`${HOME}/db/systemToken`, 'utf-8');
                        // if (existsSystemToken) {
                        //     console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - systemToken deleted now -  -  -  -  - `);
                        //     fs.truncate(`${HOME}/db/systemToken`, 0, function () { console.log('systemToken data removed') })
                        // }
                        let existshubKeyVal = fs.existsSync(`${HOME}/db/hubKeyVal`, 'utf-8');
                        if (existshubKeyVal) {
                            console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - hubKeyVal deleted now -  -  -  -  - `);
                            fs.truncate(`${HOME}/db/hubKeyVal`, 0, function () { console.log('hubKeyVal data removed') })
                        }
                        exec(`sudo rm -rf ${HOME}/logs/*_log.tar.gz`, function (err3) {
                            if (!err3) {
                                console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - log tar file removed successFully -  -  - -  - `);
                            } else {
                                console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - error while removing  log tar file -  -  -  -  - `);
                                console.log(err3)
                            }
                        })
                        exec(`sudo rm -rf ${HOME}/logs/demo.txt`, function (err4) {
                            if (!err4) {
                                console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - log tar file removed successFully -  -  - -  - `);
                            } else {
                                console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - error while removing  log tar file -  -  - -  - `);
                                console.log(err4)
                            }
                        })
                        let deleteFiles1 = ["SECN", "PRIM"]
                        fs.readdir(`${HOME}/localassets`, (errs, files) => {
                            if (!errs) {
                                async.each(files, (file, cb) => {
                                    console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - check db File ${file} -  -  -  -  - `);
                                    if (deleteFiles1.includes(file)) {
                                        exec(`sudo rm -rf ${HOME}/localassets/${file}`, function (err12) {
                                            if (!err12) {
                                                console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - File localassets successFully -  -  - ${file} -  - `);
                                                cb();
                                            } else {
                                                console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - error while deleting file -  -  - ${file} -  - `);
                                                console.log(err12)
                                                cb(err12);
                                            }
                                        })
                                    } else {
                                        cb();
                                    }
                                }, (err2) => {
                                    if (!err2) {
                                        console.log(` ${new Date().toJSON()} - systemAction - deleteDbFiles - all files from localassets deleted now -  -  -  -  - `);
                                    }
                                })
                            }
                        })
                        sendPercentage('hardreset', 75, "db files deleted successfully", 'maintenanceaction')
                        removeUnwantedImages({ data: { type: "removeimages" } }, () => {
                            mqttWrite("systemAction/responseAction", { communicationId: iObj.communicationId, data: { Error: false } })
                        })
                    } else {
                        mqttWrite("systemAction/responseAction", { communicationId: iObj.communicationId, data: { Error: true } })
                    }
                });
            }
        });
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : setWeeklyDbSchedule : Exception occured!!!!!!`);
        console.log(error);
    }
}

const changeHubtype = (message) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction  - inside changeHubtype : function  `);
        let obj = message.data.obj
        console.log(`${new Date().toJSON()} - systemAction  - removing portalSetupFlag flag  `);
        exec(`
            sudo sed -i '/'portalSetupFlag'/d' /etc/environment  && sudo sed -i '/'hubDeploymentType'/d' /etc/environment
            `, (err) => {
            if (err) {
                console.log('error in removing hubDeploymentType and portalSetupFlag flag :' + err);
                mqttWrite("systemAction/responseAction", { communicationId: message.communicationId, data: { Error: true } })
            } else {
                console.log('no error while removing  hubDeploymentType and  portalSetupFlag flags ');
                exec(`
                    sudo sh -c "echo 'hubDeploymentType=${obj.hubDtype}' >> /etc/environment" && sudo sh -c "echo 'portalSetupFlag=${obj.flag}' >> /etc/environment" 
                    `, (err2) => {
                    if (err2) {
                        mqttWrite("systemAction/responseAction", { communicationId: message.communicationId, data: { Error: true } })
                        console.log('while changing hubDeploymentType and  portalSetupFlag value :' + err2);
                    } else {
                        console.log(` hubDeploymentType : ${obj.hubDtype} and  portalSetupFlag : ${obj.flag}`);
                        lastUpdatedHubType['hubDeploymentType'] = obj.hubDtype
                        mqttWrite("systemAction/responseAction", { communicationId: message.communicationId, data: { Error: false } })
                    }
                })
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : changeHubtype : Exception occured!!!!!!`);
        console.log(error);
    }
}

const UpdateHubType = (message) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction  - inside UpdateHubType : function  `);
        let obj = message.data.obj
        console.log(`${new Date().toJSON()} - systemAction  - updating hub type `);
        exec(`sudo sed -i '/'HUB_TYPE'/d' /etc/environment`, (err) => {
            if (err) {
                console.log('error while updating HUB_TYPE :' + err);
                mqttWrite("systemAction/responseAction", { communicationId: message.communicationId, data: { Error: true, ErrorMsg: err } })
            } else {
                console.log('HUB_TYPE removed successfully ');
                exec(`sudo sh -c "echo 'HUB_TYPE=${obj.hubtype}' >> /etc/environment"`, (err2) => {
                    if (err2) {
                        mqttWrite("systemAction/responseAction", { communicationId: message.communicationId, data: { Error: true } })
                        console.log('while changing HUB_TYPE :' + err2);
                    } else {
                        console.log('updated HUB_TYPE values successfully ');
                        mqttWrite("systemAction/responseAction", { communicationId: message.communicationId, data: { Error: false } })
                    }
                })
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : UpdateHubType : Exception occured!!!!!!`);
        console.log(error);
        mqttWrite("systemAction/responseAction", { communicationId: message.communicationId, data: { Error: true, ErrorMsg: error } })
    }
}

const formatBytes = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};


const calculateFolderSize = (folder) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction  - inside calculateFolderSize : function  `);
        let size = 0;
        const calculate = (currentPath) => {
            const stats = fs.statSync(currentPath);
            if (stats.isFile()) {
                size += stats.size;
            } else if (stats.isDirectory()) {
                const subItems = fs.readdirSync(currentPath);
                subItems.forEach(item => calculate(path.join(currentPath, item)));
            }
        };
        calculate(folder);

        return size;
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : calculateFolderSize : Exception occured! ` + error);
    }
};

const removeUnwantedLogs = () => {
    try {
        console.log(`${new Date().toJSON()} - systemAction  - inside removeUnwantedLogs : function  `);
        let foldersize = calculateFolderSize(`${HOME}/logs`)
        let twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        if (foldersize > (1.5 * 1024 * 1024 * 1024)) {
            console.log(`${new Date().toJSON()} - Folder size ${formatBytes(foldersize)} exceeds 1.5 GB.`);
            const calculate = (currentPath) => {
                const stats = fs.statSync(currentPath);
                if (stats.isFile() && stats.mtimeMs < twoWeeksAgo) {
                    console.log(`${new Date().toJSON()} - systemAction : removeUnwantedLogs - calculate - filename : ${currentPath.split('/')[currentPath.split('/').length - 1]}`);
                    fs.unlink(currentPath, err => {
                        if (err) {
                            console.log(`${new Date().toJSON()} - systemAction : deleteFile - Error deleting ${currentPath}: ${JSON.stringify(err)}`)
                        } else {
                            console.log(`${new Date().toJSON()} - systemAction : deleteFile - deleted file successfully ${currentPath.split('/')[currentPath.split('/').length - 1]} `)
                        }
                    });
                } else if (stats.isDirectory()) {
                    console.log(`${new Date().toJSON()} - systemAction : removeUnwantedLogs - calculate - directory : ${currentPath.split('/')[currentPath.split('/').length - 1]}`)
                    const subItems = fs.readdirSync(currentPath);
                    subItems.forEach(item => calculate(path.join(currentPath, item)));
                }
            };
            calculate(`${HOME}/logs`);
        } else {
            console.log(`${new Date().toJSON()} - Folder size ${formatBytes(foldersize)} is within the limit no need to delete any file.`);
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : removeUnwantedLogs : Exception occured! ` + error);
    }
}

const publishReq = () => {
    try {
        let writeFileDir = HOME;
        console.log(`${new Date().toJSON()} - systemAction  - inside publishReq : function  `);
        fs.stat(writeFileDir + 'localassets/SECN', (err, state) => {
            if (err) {
                console.log(`${new Date().toJSON()} - publishReq - no folder localassets/SECN present  -  -  - `)
            } else {
                console.log(`hubModes - publishReq - Action ---> in function publishReq - and SECN folder is present  -  - `)
                fs.stat(writeFileDir + 'localassets/SECN' + '/assets', (err2, state) => {
                    if (err2) {
                        console.log(`hubModes - publishReq - no folder localassets/SECN/assets present  -  -  - `)
                    } else {
                        console.log(`hubModes - publishReq - Action ---> in function publishReq - and SECN/asset folder is present  -  - `)
                        fs.stat(writeFileDir + 'localassets/PRIM', (err1, state) => {
                            if (err1) {
                                console.log(`hubModes - publishReq - no folder localassets/PRIM present  -  -  - `)
                                fs.mkdir(writeFileDir + 'localassets/' + 'PRIM', (ierr) => {
                                    if (ierr) {
                                        console.log(`hubModes - publishReq - error while creating PRIM directory - ${JSON.stringify(ierr)} -  - `)
                                    } else {
                                        console.log(`hubModes - publishReq - created new PRIM directory -  - `)
                                        exec(`
                                            cd ${writeFileDir}
                                            sudo cp -rf ${writeFileDir + 'localassets/SECN/assets'} ${writeFileDir + 'localassets/PRIM'}
                                            sudo chmod -R 777 /home/linaro/localassets
                                        `, (errc, sucess, perr) => {
                                            if (errc) {
                                                console.log(`hubModes - publishReq - ${errc} -  - `)
                                            }
                                            if (sucess) {
                                                console.log(`hubModes - publishReq - ${sucess} -  - `)
                                            }
                                            if (perr) {
                                                console.log(`hubModes - publishReq - ${perr} -  - `)
                                            }
                                        })
                                    }
                                })
                            } else {
                                console.log(`hubModes - publishReq - Action ---> in function publishReq - and PRIMt folder is present  -  - `)
                                fs.stat(writeFileDir + 'localassets/PRIM/assets', (err3, state) => {
                                    if (err3) {

                                        exec(`
                                            cd ${writeFileDir}
                                            sudo cp -rf ${writeFileDir + 'localassets/SECN/assets'} ${writeFileDir + 'localassets/PRIM'}
                                            sudo chmod -R 777 /home/linaro/localassets
                                            `, (err, sucess, perr) => {
                                            if (err) {
                                                console.log(`hubModes - publishReq - ${err} -  - `)
                                            }
                                            if (sucess) {
                                                console.log(`hubModes - publishReq - ${sucess} -  - `)
                                            }
                                            if (perr) {
                                                console.log(`hubModes - publishReq - ${sucess} -  - `)
                                            }
                                        })
                                    } else {
                                        exec(`
                                            sudo rm -rf ${writeFileDir + 'localassets/PRIM/assets'}
                                            cd ${writeFileDir}
                                            sudo cp -rf ${writeFileDir + 'localassets/SECN/assets'} ${writeFileDir + 'localassets/PRIM'}
                                            sudo chmod -R 777 /home/linaro/localassets
                                            `, (err, sucess, perr) => {
                                            if (err) {
                                                console.log(`hubModes - publishReq - ${err} -  - `)
                                            }
                                            if (sucess) {
                                                console.log(`hubModes - publishReq - ${sucess} -  - `)
                                            }
                                            if (perr) {
                                                console.log(`hubModes - publishReq - ${sucess} -  - `)
                                            }
                                        })
                                    }
                                })

                            }
                        })
                    }
                })
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction : publishReq : Exception occured! ` + error);
    }
}


const Command = (cmd) => {
    try {
        const { execSync } = require('child_process');
        const result = execSync(`${cmd}`, { encoding: 'utf-8' });
        return result;
    } catch (error) {
        console.error('Error:', error.message);
        console.log('inside else condition');
        throw error;
    }
}

function cleanupAndReboot(cb) {
    try {
        process.chdir(HOME); // Change the working directory
        let removeenv = Command('sudo -u root bash -c "cat /dev/null > /etc/environment"'); // Update /etc/environment file
        console.log(`remoing envirnment variables : ${removeenv}`);
        sendPercentage('factoryreset', 10, 'inside directory', 'factoryreset')
        let rhosts = Command(`sudo sed -i \'/127.0.1.1/d\' /etc/hosts && echo file is now empty || echo file is not empty`) //Update /etc/hosts file
        console.log(`removing hosts from file : ${rhosts}`);
        sendPercentage('factoryreset', 20, 'removed content of environment file', 'factoryreset')
        let changehostname = Command(`sudo -u root bash -c "cat /dev/null > /etc/hostname"`); ////Update /etc/hostname file
        console.log(`removing hostname from file : ${changehostname}`);
        sendPercentage('factoryreset', 25, 'removed hosts', 'factoryreset')
        let removenodeentry = Command(`sed -i \'/node-v10.1.0/d\' /home/linaro/.bashrc`) // Remove node path entry from bashrc file
        console.log(`removing node path entry from bashrc file : ${removenodeentry}`);
        sendPercentage('factoryreset', 30, 'removed hostname', 'factoryreset')
        let removeunwantedimg = Command(`sudo docker system prune -f`) // Remove unwanted images
        console.log(`removing unwanted docker images : ${removeunwantedimg}`);
        sendPercentage('factoryreset', 35, 'removing unwanted docker images', 'factoryreset')
        console.log('Success response send');
        cb(false);
    } catch (error) {
        cb(error);
    }
}

const FacoryReset = (message) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction  - inside FacoryReset `);
        if (message.hasOwnProperty('data') && message.data.hasOwnProperty('authKey') && message.data.authKey == mqtt_authkey) {
            cleanupAndReboot((error) => {
                if (error) {
                    console.error(`Error: ${error.message}`);
                    mqttWrite("systemAction/responseAction", {
                        data: { systemActionFlag: false, Error: error },
                        communicationId: message.communicationId
                    });
                } else {
                    mqttWrite("systemAction/responseAction", {
                        data: { systemActionFlag: true },
                        communicationId: message.communicationId
                    });
                    let rvolumefolders = Command(`sudo rm -rf Docker_scripts db logs node_modules sounds localassets pyIOT_files pyIOT_logs node-v10.1.0-linux-*`) //Remove Volume folders from hub
                    console.log(`removing docker volume folders from hub : ${rvolumefolders}`);
                    sendPercentage('factoryreset', 40, 'removing docker volume folders from hub', 'factoryreset')
                    let stopcontainers = Command(`sudo docker stop $(sudo docker ps -a -q)`) // stop all container
                    console.log(`stoping docker containers : ${stopcontainers}`);
                    sendPercentage('factoryreset', 50, 'stop docker containers', 'factoryreset')
                    let rallcontainer = Command(`sudo docker rm -f $(sudo docker ps -a -q)`) //Remove all container
                    console.log(`removing all docker containers from hub : ${rallcontainer}`);
                    sendPercentage('factoryreset', 60, 'Removed all containers from hub', 'factoryreset')
                    let rvolumelinks = Command(`sudo docker volume rm -f $(sudo docker volume ls -q)`) // Remove volume links
                    console.log(`removing docker volume links from hub : ${rvolumelinks}`);
                    sendPercentage('factoryreset', 70, 'removing docker volume links from hub', 'factoryreset')
                    let rallimg = Command(`sudo docker rmi -f $(sudo docker images -q)`) //Remove all images
                    console.log(`removing all docker images from hub : ${rallimg}`);
                    sendPercentage('factoryreset', 75, 'Removed docker all images', 'factoryreset')
                    let rrcrontab = Command('sudo crontab -r'); //Remove root crontabs
                    console.log(`removing root crontab : ${rrcrontab}`);
                    let rurontabd = Command(`crontab -l -u linaro && crontab -r -u linaro || no crontab found `); //Remove user crontabs
                    console.log(`removed user crontabs ${rurontabd}`);
                    sendPercentage('factoryreset', 80, 'Removed crontabs', 'factoryreset')
                    let rallfiles = Command(`rm -rf *`) // Remove all files
                    console.log(`removing all files from hub : ${rallfiles}`);
                    sendPercentage('factoryreset', 90, 'Removed all files from hub ', 'factoryreset')
                    sendPercentage('factoryreset', 100, 'hub rebooted', 'factoryreset')
                    let reboot = Command(`sudo reboot`) // Reboot the hub
                    console.log(`Rebooting hub : ${reboot}`);
                }
            });
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction - FacoryReset - Error occured! : ${error}`);
    }
}


const StopAllprocess = (message) => {
    try {
        console.log(`${new Date().toJSON()} - systemAction  - inside StopAllprocess `);
        if (message.hasOwnProperty('data') && message.data.hasOwnProperty('authKey') && message.data.authKey == mqtt_authkey) {
            try {
                let stopcontainers = Command(`sudo docker stop $(sudo docker ps -a -q)`) // stop all container
                console.log(`stoping docker containers : ${stopcontainers}`);
                let rallcontainer = Command(`sudo docker rm -f $(sudo docker ps -a -q)`) //Remove all container
                console.log(`removing all docker containers from hub : ${rallcontainer}`);
                exec(`
                comment_crontab() {
                    output_file="commented_crontab.txt"
                    cron_entries=$(sudo crontab -l)
                    if [ -n "$cron_entries" ]; then
                        sudo crontab -r
                        echo "$cron_entries" | while IFS= read -r line; do
                            commented_line="# $line"
                            echo "$commented_line" >> "$output_file"
                        done
                        cat "$output_file" | sudo crontab -
                        echo "Commented crontab entries saved to $output_file."
                        rm "$output_file"
                    else
                        echo "No crontab entries found for root user."
                    fi
                }
                comment_crontab
                `)
                let ct = new Date().getTime()
                let stopallprocess = Command(`sudo sed -i '/'stopallprocess'/d' /etc/environment && sudo sh -c "echo 'stopallprocess=${ct}' >> /etc/environment"`)
                console.log(`entry of stopall process in envirnment variables : ${stopallprocess}`);
                let reboothub = Command(`sudo init 6`);
                console.log(`hub reboot : ${reboothub}`);
                mqttWrite("systemAction/responseAction", {
                    data: { systemActionFlag: true },
                    communicationId: message.communicationId
                });
            } catch (error) {
                console.error(`Error: ${error}`);
                mqttWrite("systemAction/responseAction", {
                    data: { systemActionFlag: false, Error: error },
                    communicationId: message.communicationId
                });
            }
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - systemAction - StopAllprocess - Error occured! : ${error}`);
    }
}


if (mqttclient) {
    console.log(`${new Date().toJSON()} <---Mqtt client is present --> `);
    mqttclient.on('message', (topic, message1) => {
        console.log(`${new Date().toJSON()} - SystemAction message - ${message1.toString()} on topic ${topic}`);
        let message = JSON.parse(message1.toString());
        if (typeof message == "string") {
            message = JSON.parse(message)
        }
        console.log(`${new Date().toJSON()} <---Message --> : ${message}`);
        switch (topic) {
            case 'maintenanceAction/requestAction':
                console.log(`${new Date().toJSON()} <----maintenanceAction/requestAction : ${message.data}`);
                console.log(`${new Date().toJSON()} - message.data.type --> : ${message.data.type}`);
                switch (message.data.type) {
                    case "reboothub":
                        console.log(`${new Date().toJSON()} - SystemAction : maintenanceAction/powerReboot : hub reboot`);
                        rebootHub(message);
                        break;
                    case "sshkey":
                        console.log(`${new Date().toJSON()} - SystemAction : maintenanceAction/generatesshKeys: generate ssh key`);
                        geneartesshKeys(message);
                        break;
                    case "getosdata":
                        console.log(`${new Date().toJSON()} - SystemAction : maintenanceAction/getosdata: get os data`);
                        sendOsData(message);
                        break;
                    case "resetcrontab":
                        console.log(`${new Date().toJSON()} - SystemAction : maintenanceAction/resetCrontab: reset crontab`);
                        resetCrontab(message);
                        break;
                    case "remoteaccess":
                        console.log(`${new Date().toJSON()} - SystemAction : maintenanceAction/remoteAccess : take remote access`);
                        remoteAccess(message);
                        break;
                    case "firmwarereset":
                        console.log(`${new Date().toJSON()} - SystemAction : maintenanceAction/firmwareReset : Reset the firmware`);
                        firmwareReset(message);
                        break;
                    case "uploadlog":
                        console.log(`${new Date().toJSON()} - SystemAction : uploadlog : upload logs`);
                        uploadLogs(message);
                        break;
                    case "remoteserviceold":
                        console.log(`${new Date().toJSON()} - maintenanceAction/remoteServiceOld : remote service old `);
                        remoteServiceOld(message);
                        break;
                    case "networkdetails":
                        console.log(`${new Date().toJSON()} - SystemAction : network/getNetworkDetails : get network details`);
                        networkCommunicationId = message.communicationId;
                        getNetworkDetails(message);
                        break;
                    case "updatehub":
                        console.log(`${new Date().toJSON()} - SystemAction : maintenanceAction/updatehub : Update the hub : `);
                        upDateHub(message);
                        break;
                    case "removeimages":
                        console.log(`${new Date().toJSON()} - SystemAction : maintenanceAction/removeimages : remove images on hub : `);
                        removeUnwantedImages(message);
                        break;
                    case "setSchedule":
                        console.log(`${new Date().toJSON()} - SystemAction : maintenanceAction/setSchedule : set Schedule on hub : `);
                        setWeeklyDbSchedule(message);
                        break;
                    case "deleteDbFiles":
                        console.log(`${new Date().toJSON()} - SystemAction : deleteDbFiles : delete files from db : `);
                        deleteDbFiles(message);
                        break;
                    case "changeDeploymentType":
                        console.log(`${new Date().toJSON()} - SystemAction : changeDeploymentType : change deployment type of hub : `);
                        changeHubtype(message);
                        break;
                    case "changeHubType":
                        console.log(`${new Date().toJSON()} - SystemAction : changeHubType : change hub type : `);;
                        UpdateHubType(message);
                        break;
                    case "removeLogs":
                        console.log(`${new Date().toJSON()} - SystemAction : removeLogs : remove logs older than 2 weeks from hub : `);
                        removeUnwantedLogs();
                        break;
                    case "publish":
                        console.log(`${new Date().toJSON()} - SystemAction : publish : got publish request from soulhub : `);
                        publishReq();
                        break;
                    case 'factoryReset':
                        console.log(`${new Date().toJSON()} - SystemAction : publish : got factory reset request from soulsystem : `);
                        FacoryReset(message);
                        break;
                    case 'stopAllProcess':
                        console.log(`${new Date().toJSON()} - SystemAction : publish : got stop all process request from soulsystem : `);
                        StopAllprocess(message);
                        break;
                }
                break;
            case 'soulHubAction/restartsoulhubProcess':
                console.log(`${new Date().toJSON()} - SystemAction : soulHubAction/restartsoulhubProcess : restart soulhub Process`);
                restartsoulhubProcess();
                break;
            case 'soulHubAction/restartAllProcess':
                console.log(`${new Date().toJSON()} - SystemAction : soulHubAction/restartAllProcess : restart All Process`);
                restartAllProcess();
                break;
            case 'maintenanceAction/remoteServiceOld':
                console.log(`${new Date().toJSON()} - maintenanceAction/remoteServiceOld : `);
                remoteServiceOld(message);
                break;
            case 'soulDapi/driverUpdate':
                console.log(`${new Date().toJSON()} - soulDapi/driverUpdate : `);
                updateDriver(message);
                break;
            case 'soulDapi/deleteDriver':
                console.log(`${new Date().toJSON()} - soulDapi/driverUpdate : `);
                deleteDriver(message);
                break;
            default:
                console.log(`${new Date().toJSON()} defeault case : ${message}`)
                break;
        }
    })
}