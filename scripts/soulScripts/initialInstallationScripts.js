'use strict';
require('shelljs/global');
const mqtt = require('mqtt');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { exec } = require('child_process');
let client = 'v2admin' + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + "getScene"
const hubType = process.env.HUB_TYPE;
const hubSub = process.env.HubSub;
let platform = os.platform();
const host_ip = process.env.host_ip;
let initSetupCount = 0;
let initsetup = 0
let GROUP;
let HOME;
let sceneVersion = 3;
let OWNER = 'linaro';
if (platform == "linux") {
    HOME = "/home/linaro/";
    GROUP = "linaro";
} else {
    GROUP = "staff";
}
let server = fs.readFileSync(`${HOME}/db/server`, {
    encoding: 'utf8'
}).trim();
const serial = fs.readFileSync(`${HOME}/db/serial`, {
    encoding: 'utf8'
}).trim();
const CODED_HUBID = fs.readFileSync(`${HOME}/db/CODED_HUBID`, {
    encoding: 'utf8'
}).trim();
const mqtt_authkey = process.env.mqtt_authkey ? process.env.mqtt_authkey : 'NA';
console.log(`${new Date().toJSON()} - initialInstallationScripts - initialInstallationScripts - mqtt_authkey ${mqtt_authkey} -  -  -  -  - `);
let mqttSubscribeTopics = ['v2admin', 'hubActionResponse/installer', 'soulDb/dbResponse/systemdbresponse', 'systemAction/responseAction', 'process/status/soulSystem', 'systemAction/driverStatus', 'soulDapi/deleteDriver', 'node/deviceControlProperties', client];

const MQTT_HOST = process.env.ApplicationEnv && process.env.ApplicationEnv == 'Docker' ? '172.17.0.1' : "0.0.0.0";
const MQTT_PORT = process.env.broker_port ? process.env.broker_port : '8886';
let mqttclient;

let initialInstallationScriptId = 'initialInstallationScript_' + serial;
let willPayload = {
    clientId: initialInstallationScriptId
};
const jsonfile = require('jsonfile');
let pass = '@$0uL$y$tem';

let hubOs = {
    'Linux': 1,
    'MAC': 2,
    'WIN': 3,
    'Ubuntu': 4,
    'Debian': 5,
    'Raspbian': 6
}

let sceneForDeploymentType = {
    "a": [244, 248],
    "b": [244, 248],
    "c": [244, 248],
    "d": [308],
    "e": [308],
    "f": [244, 248],
    "g": [308],
    "i": [308],
    "j": [308],
    "k": [308],
    "l": [308],
    "m": [308],
    "n": [308]
}

const EventEmitter = require('events');
const Emitter = new EventEmitter();
mqttclient = mqtt.connect('mqtt://' + MQTT_HOST + ':' + MQTT_PORT, {
    username: 'CEDSystem',
    password: pass,
    will: {
        topic: 'initialInstallationScriptDisconnected',
        payload: JSON.stringify(willPayload)
    },
    clientId: initialInstallationScriptId,
    reconnectPeriod: 100000,
    keepalive: 60,
});


let get_scene = {
    "data": {
        "requestId": "abcd123",
        "userId": 'admin@clouzer.com',
        "clientId": "v2admin"
    },
    "type": "get_scene"
}

const getDeploymentType = () => {
    return process.env.hubDeploymentType ? process.env.hubDeploymentType : 'a';
}

let sceneFilePath = HOME + 'Docker_scripts/soulScripts/scene.json';
let sceneData = fs.readFileSync(sceneFilePath);
let parsedData

mqttclient.on('connect', () => {
    console.log(`${new Date().toJSON()} - initialInstallationScript : connected to - mqtt://${MQTT_HOST}:${MQTT_PORT}`);
    mqttclient.subscribe(mqttSubscribeTopics);
    mqttWrite('process/status/initProcess', { action: 'started', ts: new Date().getTime(), process: 'initProcess' });
});

mqttclient.on('disconnect', () => {
    console.log(`${new Date().toJSON()} - initialInstallationScript : Mqtt client disconnect event triggered `);
});

mqttclient.on('close', () => {
    console.log(`${new Date().toJSON()} - initialInstallationScript : Mqtt client disconnected from server`);
    mqttclient.end();
});

mqttclient.on('end', () => {
    console.log(`${new Date().toJSON()} - initialInstallationScript :  mosquitto client end event triggered`);
    mqttclient.end();
});


mqttclient.on('error', (error) => {
    console.log(`${new Date().toJSON()} - initialInstallationScript : mosquitto client error event triggered ${error}`);
    mqttclient.end();
});

const mqttWrite = (topic, data) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript : mqttWrite : published on ${topic} publishing the mesage - ${JSON.stringify(data)}`);
        mqttclient.publish(topic, JSON.stringify(data));
    } catch (error) {
        console.log(`${new Date().toJSON()} - initialInstallationScript : mqttWrite : Execption occured while `);
        console.log(error);
    }
}

const getSceneByDeploymentType = (sceneData, cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript - getSceneByDeploymentType - -  -  -  -  -  - `)
        let hubDeploymentType = getDeploymentType();
        let allSceneData = JSON.parse(sceneData)
        console.log(`${new Date().toJSON()} - initialInstallationScript - getSceneByDeploymentType - - ${hubDeploymentType} - ${JSON.stringify(sceneForDeploymentType)} -  -  -  - `)
        let sceneArr = []
        allSceneData.forEach((eachScene, ind, arr) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript - getSceneByDeploymentType - eachScene - ${JSON.stringify(eachScene.data.dataArray[0].ID)} -  -  -  -  -  - `)
            if (sceneForDeploymentType[hubDeploymentType].includes(eachScene.data.dataArray[0].ID)) {
                sceneArr.push(eachScene)
            }
            if (ind == arr.length - 1) {
                console.log(`${new Date().toJSON()} - initialInstallationScript - getSceneByDeploymentType - FinalSceneArray - ${JSON.stringify(sceneArr)} -  -  -  -  - `)
                cb(sceneArr);
            }
        });
    } catch (err) {
        console.log(`${new Date().toJSON()} - initialInstallationScript - getSceneByDeploymentType - ERROR - ${err} -  -  -  -  - `)
    }
}


const sceneDeletion = (fNames) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript - inside sceneDeletion -  -  - `)
        let sceneidsArray = [];
        let dbsceneArray = [];
        let imagesArr = [];
        JSON.parse(sceneData).forEach((scene, index, arr) => {
            sceneidsArray.push(scene.data.dataArray[0].ID);
        })
        console.log(`${new Date().toJSON()} - initialInstallationScript - sceneDeletion - sceneidsArray : ${sceneidsArray}`)
        fNames.forEach((element, id, arr) => {
            let name = element.split('.');
            JSON.parse(sceneData).forEach(scene => {
                if (name[0] == scene.data.dataArray[0].NAME) {
                    console.log(`${new Date().toJSON()} - initialInstallationScript - sceneDeletion - Present Scene Name is ${scene.data.dataArray[0].NAME} and Present Images are ${element}`)
                    imagesArr.push(name[0])
                }
            })
        })
        console.log(`${new Date().toJSON()} - initialInstallationScript - sceneDeletion - imagesArr : ${imagesArr}`)
        getScene((sceneData) => {
            console.log(` ${new Date().toJSON()} - initialInstallationScript - sceneDeletion - got data from db`);
            if (sceneData.dataArray.length > 0) {
                sceneData.dataArray.forEach((scene, index, arr) => {
                    dbsceneArray.push(scene.ID)
                    if (index == arr.length - 1) {
                        addNDelete(dbsceneArray, sceneidsArray, imagesArr)
                    }
                })
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - initialInstallationScript - sceneDeletion - error ${error} -  - `)
    }
}

const addNDelete = (dbsceneArray, sceneidsArray, imagesArr) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript - inside addNDelete -  -  - `)
        let sceneidDelete = [];
        let hubtypescene = sceneForDeploymentType[getDeploymentType()];
        let sceneToAdd = []
        console.log(`${new Date().toJSON()} - initialInstallationScript - addNDelete - dbsceneArray : ${dbsceneArray}`)
        dbsceneArray.forEach((id, index, arr) => {
            if (hubtypescene.includes(id)) {
                if (hubtypescene.indexOf(id) !== -1) {
                    hubtypescene.splice(hubtypescene.indexOf(id), 1);
                }
            } else if (sceneidsArray.includes(id)) {
                console.log(`${new Date().toJSON()} - initialInstallationScript - addNDelete scene id : ${id} need to delete`)
                sceneidDelete.push(id)
            }
            if (index == arr.length - 1) {
                SceneDelete(sceneidDelete)
                let obj = JSON.parse(sceneData)
                if (hubtypescene.length == 0) {
                    console.log(`${new Date().toJSON()} - initialInstallationScript - addNDelete - no need to add more scene in db`)
                } else {
                    hubtypescene.forEach((id, index) => {
                        console.log(`${new Date().toJSON()} - initialInstallationScript - addNDelete id : ${id} adding this scene into db`);
                        newFunctiontoGenScnes(obj, id, (scene) => {
                            console.log(`${new Date().toJSON()} - initialInstallationScript - addNDelete - need to add this scene in db : ${id}`)
                            sceneToAdd.push(scene);
                        })
                        if (index == hubtypescene.length - 1) {
                            console.log(`${new Date().toJSON()} - initialInstallationScript - addNDelete - scene added successfully - ${JSON.stringify(sceneToAdd)}`);
                            checkHubMode(() => {
                                console.log(`${new Date().toJSON()} - initialInstallationScript - addNDelete - scene table is empty adding new scenes`)
                                addScene(sceneToAdd, '', imagesArr, () => {
                                    console.log(`${new Date().toJSON()} - initialInstallationScript - addNDelete - scene added successfully`);
                                })
                            })
                        }
                    })
                }
            }
        });
    } catch (error) {
        console.log(`${new Date().toJSON()} - initialInstallationScript - addNDelete - error ${error} -  - `)
    }
}

const newFunctiontoGenScnes = (obj, id, cb) => {
    try {
        let object;
        obj.forEach((parsedEle, parseId, parseArr) => {
            if (parsedEle.data.dataArray[0].ID == id) {
                object = parsedEle
            }
            if (parseId == parseArr.length - 1) {
                cb(object);
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - initialInstallationScript - newFunctiontoGenScnes - error ${error} -  - `)
    }
}

Emitter.on("increaseCount", (iobj) => {
    initSetupCount++;
    console.log(`${new Date().toJSON()} - increaseCount : In the function  publishing the mesage - ${JSON.stringify(iobj)} && count ${initSetupCount}`);
    if (initSetupCount == 3) {
        let communicationId1 = new Date().getTime() + 'getmac' + crypto.randomBytes(1).toJSON().data[0];
        mqttWrite('maintenanceAction/requestAction', {
            data: {
                authKey: mqtt_authkey,
                type: "getosdata"
            },
            communicationId: communicationId1
        });
        Emitter.on(communicationId1, (err, systemData) => {
            let mac = systemData.CML_ETH_MAC.toUpperCase();
            let obj = {
                data: {
                    requestId: new Date().getTime() + "checkmode" + Math.ceil(crypto.randomBytes(1).toJSON().data[0] * 100),
                    userId: mac,
                    clientId: new Date().getTime() + "checkmode" + Math.ceil(crypto.randomBytes(1).toJSON().data[0] * 100)
                },
                type: "initial_installation_setup"
            }
            mqttWrite("process/initSetupStatus", obj)
        });
    }
})

const checkHubMode = (cb) => {
    try {
        console.log(` ${new Date().toJSON()} - In clouzerSoulIp - checkHubMode - action=> check hub mode request received - - -`)
        let requestId = new Date().getTime() + "checkmode" + Math.ceil(crypto.randomBytes(1).toJSON().data[0] * 100);
        let clientId = "v2admin" + new Date().getTime() + "clientIdcheckmode" + Math.ceil(crypto.randomBytes(1).toJSON().data[0] * 100);
        mqttclient.subscribe(clientId);
        let obj = {
            data: {
                requestId: requestId,
                userId: 'admin@clouzer.com',
                clientId: clientId
            },
            type: "get_mode"
        }
        mqttWrite('hubAction/installer', obj)
        Emitter.on(requestId, (err, DataFromDataBase) => {
            console.log(`${new Date().toJSON()} - In clouzerSoulIp : In checkHubMode : Success  ${DataFromDataBase}`)
            if (DataFromDataBase.dataArray[0].hasOwnProperty('hubMode') && (DataFromDataBase.dataArray[0].hubMode != "10" && DataFromDataBase.dataArray[0].hubMode != "04")) {
                console.log(`${new Date().toJSON()} - change hub mode`)
                let initialMode = DataFromDataBase.dataArray[0].hubMode;
                let clientId1 = "v2admin" + new Date().getTime() + "clientIdchangemode" + Math.ceil(crypto.randomBytes(1).toJSON().data[0] * 100);
                mqttclient.subscribe(clientId1);
                let changeModerequestId = new Date().getTime() + 'soulsystemchangeModeReqfrominit' + crypto.randomBytes(1).toJSON().data[0];
                let changeModeObj = {
                    type: "change_mode",
                    data: {
                        systemData: [{
                            hubMode: "CONFIG_START"
                        }],
                        requestId: changeModerequestId,
                        userId: "admin@clouzer.com",
                        clientId: clientId1
                    }
                }
                mqttWrite('hubAction/installer', changeModeObj)
                Emitter.on(changeModerequestId, (err, systemData) => {
                    console.log(`${new Date().toJSON()} - checkHubMode : change_mode response got from soulhub - err : ${err} - systemData : ${systemData}`);
                    if (systemData && systemData.dataArray[0].hasOwnProperty('hubMode') && systemData.dataArray[0].hubMode == "CONFIG") {
                        cb(false, () => {
                            console.log(`${new Date().toJSON()} - checkHubMode : reset hub mode ${initialMode}`);
                        });
                    }
                })
            } else {
                cb(false, () => {
                    console.log(`${new Date().toJSON()} - no need to reset mode`)
                })
            }
        })
    } catch (error) {
        console.log(` ${new Date().toJSON()} - initialInstallationScript - checkHubMode - getUserList_ERROR code#38006 -  error ${error}  -  - `);
    }
}

const getUserList = (cb) => {
    try {
        console.log(` ${new Date().toJSON()} - getUserList - getting user info -  -  -  -  - `);
        let communicationId = new Date().getTime() + 'getUserList' + crypto.randomBytes(1).toJSON().data[0];
        mqttWrite('soulDb/fetch', {
            data: {
                entity_type: 'userlist',
                or: {
                    eq: {
                        logintype: 'user'
                    },
                    or: {
                        eq: {
                            logintype: 'defaultInstaller'
                        },
                    },
                },
            },
            communicationId: communicationId,
            clientId: "systemdbresponse" + new Date().getTime()
        });
        console.log(` ${new Date().toJSON()} - initialInstallationScript - getUserList - action => get user list request - communicationId -${communicationId} `)
        Emitter.on(communicationId, (err, dataFromdb) => {
            if (err) {
                console.log(` ${new Date().toJSON()} - initialInstallationScript - getUserList - Exception  while getting user info  - ${err}  -  -  -  - `);
                cb(err)
            } else {
                console.log(` ${new Date().toJSON()}  - initialInstallationScript - getUserList - Data is ${JSON.stringify(dataFromdb)} -  -  -  -  - `);
                cb(dataFromdb);
            }
        })
    } catch (error) {
        console.log(` ${new Date().toJSON()}  - initialInstallationScript - getUserList - getUserList_ERROR code#38006 -  error ${error}  -  - `);
    }
}

const getPropertyDetails = (cb) => {
    try {
        console.log(` ${new Date().toJSON()} - initialInstallationScript - getPropertyDetails - getting property details -  -  -  -  - `);
        let communicationId = new Date().getTime() + 'getPropertyDetails' + crypto.randomBytes(1).toJSON().data[0];
        mqttWrite('soulDb/fetch', {
            data: {
                entity_type: 'property',
            },
            communicationId: communicationId,
            clientId: "systemdbresponse" + new Date().getTime()
        });
        console.log(` ${new Date().toJSON()} - initialInstallationScript - getPropertyDetails - action => get credentials details from db request - communicationId -${communicationId} `)
        Emitter.on(communicationId, (err, dataFromDbProperty) => {
            if (err) {
                console.log(` ${new Date().toJSON()} - initialInstallationScript - getPropertyDetails - Exception error while getting the Proeperty - ${err} -  -  -  - `);
                console.log(` ${new Date().toJSON()} - initialInstallationScript - getPropertyDetails - Exception error while getting the Proeperty - ${err} -  -  -  - `);
            } else {
                console.log(` ${new Date().toJSON()} - initialInstallationScript - getPropertyDetails - PreopertyData ${JSON.stringify(dataFromDbProperty)} -  -  -  -  - `);
                cb(dataFromDbProperty);
            }
        })
    } catch (error) {
        console.log(` ${new Date().toJSON()} - initialInstallationScript - getPropertyDetails - getPropertyDetails_ERROR code#38001 -  error ${error}  -  - `);
        console.log(` ${new Date().toJSON()} - initialInstallationScript - getPropertyDetails - getPropertyDetails_ERROR code#38001 -  error ${error}  -  - `);
    }
}

const getRoleDetails = (cb) => {
    try {
        console.log(` ${new Date().toJSON()} - initialInstallationScript - getRoleDetails - getting property details -  -  -  -  - `)
        let communicationId = new Date().getTime() + 'initialInstallationScriptgetroles' + crypto.randomBytes(1).toJSON().data[0];
        mqttWrite('soulDb/fetch', {
            data: {
                entity_type: 'role',
                or: {
                    eq: {
                        ROLE_NAME: 'Provisioning agent'
                    },
                    or: {
                        eq: {
                            ROLE_NAME: 'Home Owner'
                        },
                        or: {
                            eq: {
                                ROLE_NAME: 'Installer Viewer'
                            },
                        },
                    },
                },
            },
            communicationId: communicationId,
            clientId: "systemdbresponse" + new Date().getTime()
        });
        console.log(`${new Date().toJSON()} - initialInstallationScript - getUserList - action => get user list request - communicationId -${communicationId} `)
        Emitter.on(communicationId, (err, dataFromdb) => {
            if (err) {
                console.log(` ${new Date().toJSON()} - initialInstallationScript - getUserList - Exception  while getting user info  - ${err}  -  -  -  - `);
                cb(err)
            } else {
                console.log(`${new Date().toJSON()} -  initialInstallationScript - getUserList - Data is ${JSON.stringify(dataFromdb)} -  -  -  -  - `);
                cb(dataFromdb);
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - initialInstallationScript - getUserList - getUserList_ERROR code#38006 -  error ${error}  -  - `);
    }
}

const insertUser = (role, cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript - insertUser - In the function insert user - - `);
        let communicationId1 = new Date().getTime() + 'insertUser' + crypto.randomBytes(1).toJSON().data[0];
        mqttWrite('maintenanceAction/requestAction', {
            data: {
                authKey: mqtt_authkey,
                type: "getosdata"
            },
            communicationId: communicationId1
        });
        Emitter.on(communicationId1, (err, systemData) => {
            let communicationId = new Date().getTime() + 'insertUser' + crypto.randomBytes(1).toJSON().data[0];
            let clientId = "v2admin" + new Date().getTime() + "insertUser" + Math.ceil(crypto.randomBytes(1).toJSON().data[0] * 100);
            let mac;
            if (systemData.hasOwnProperty('CML_ETH_MAC')) {
                mac = systemData.CML_ETH_MAC.toUpperCase();
            } else if (systemData.hasOwnProperty('CML_WIFI_MAC')) {
                mac = systemData.CML_WIFI_MAC.toUpperCase();
            }
            let obj = {
                data: {
                    requestId: communicationId,
                    userId: "admin@clouzer.com",
                    clientId: clientId,
                    dataArray: [{
                        "hubId": serial,
                        "username": mac,
                        "ACTIVE_STATUS": 1,
                        "firstName": "Provisioning",
                        "lastName": "Agent",
                        "rPassword": CODED_HUBID,
                        "ROLE": role.ROLE,
                        "logintype": "defaultInstaller"
                    }]
                },
                type: "add_user"
            }
            mqttWrite('hubAction/installer', obj);
            console.log(`${new Date().toJSON()} - initialInstallationScript - insertUser - action => insert user - communicationId - ${communicationId} - -`)
            Emitter.on(communicationId, (error, respObj) => {
                console.log(`${new Date().toJSON()} - initialInstallationScript - insertUser - error response  ${error} -  -`)
                console.log(`${new Date().toJSON()} - initialInstallationScript - insertUser - insert user response from db  ${JSON.stringify(respObj)} -  -`)
                Emitter.emit("increaseCount", { msg: "initsetup : user is added" })
                mqttWrite('process/status/initProcess', { action: 'connected', ts: new Date().getTime(), process: 'initProcess' });
                cb()
            });
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - initialInstallationScript - insertUser - Exception while inserting user - ${error} -  -  -  - `);
    }
}


const insertuserRole = (cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript - insertuserRole - In the function check hub Status - - `);
        let defaultRoleArr = ["Provisioning agent", "Home Owner", "Installer Viewer"]
        getUserList((users) => {
            getPropertyDetails((property) => {
                if (users.length <= 0 && property.length > 0 && property[0].hasOwnProperty('KEY_VAL') && property[0].KEY_VAL == '') {
                    getRoleDetails((roles) => {
                        checkHubMode(() => {
                            function sendAddroleReq(arr, rules) {
                                let communicationId = new Date().getTime() + 'insertuserRole' + crypto.randomBytes(1).toJSON().data[0];
                                let clientId = "v2admin" + new Date().getTime() + "insertuserRole" + Math.ceil(crypto.randomBytes(1).toJSON().data[0] * 100);
                                let obj = {
                                    data: {
                                        requestId: communicationId,
                                        userId: "admin@clouzer.com",
                                        clientId: clientId,
                                        dataArray: arr,
                                        essentialList: {
                                            add_members: rules,
                                        }
                                    },
                                    type: "add_role"
                                }
                                mqttWrite('hubAction/installer', obj);
                                console.log(` ${new Date().toJSON()} - initialInstallationScript - insertuserRole - action => insert data info hubinfo table - communicationId - ${communicationId} - -`)
                                Emitter.on(communicationId, (err, roleobj) => {
                                    console.log(` ${new Date().toJSON()} - initialInstallationScript - insertuserRole - insert data response from db  ${JSON.stringify(roleobj)} -  -`)
                                    if (roleobj && roleobj.hasOwnProperty("dataArray") && roleobj.dataArray.length > 0 && roleobj.type == "add_role_hub" && roleobj.dataArray[0].ROLE_NAME == "Provisioning agent") {
                                        insertUser(roleobj.dataArray[0], cb);
                                    }
                                });
                            }
                            if (roles.length > 0) {
                                roles.forEach((role, id, arr) => {
                                    if (role["ROLE_NAME"] == "Provisioning agent") {
                                        insertUser(role, cb);
                                        defaultRoleArr.splice(role["ROLE_NAME"], 1)
                                    }
                                    else if ((role["ROLE_NAME"] == "Provisioning agent" || role["ROLE_NAME"] == "Home Owner" || role["ROLE_NAME"] == "Installer Viewer") && id == arr.length - 1) {
                                        defaultRoleArr.splice(role["ROLE_NAME"], 1)
                                    }
                                });
                                if (defaultRoleArr.length > 0) {
                                    defaultRoleArr.forEach((r) => {
                                        sendAddroleReq([{
                                            "ROLE_NAME": r,
                                            "entity_type": "role"
                                        }], r != "Home Owner" ? [1] : [22, 32, 11, 52, 53, 54, 44, 45])
                                    })
                                }
                            } else {
                                defaultRoleArr.forEach((r) => {
                                    sendAddroleReq([{
                                        "ROLE_NAME": r,
                                        "entity_type": "role"
                                    }], r != "Home Owner" ? [1] : [22, 32, 11, 52, 53, 54, 44, 45])
                                })
                            }
                        })
                    })

                }
                else {
                    console.log(` ${new Date().toJSON()} - user alredy present`)
                    Emitter.emit("increaseCount", { msg: "initsetup : user alredy present" })
                    mqttWrite('process/status/initProcess', { action: 'connected', ts: new Date().getTime(), process: 'initProcess' });
                    cb()
                }
            })
        })

    } catch (error) {
        console.log(`${new Date().toJSON()} - initialInstallationScript - insertuserRole - Exception while adding roles - ${error} -  -  -  - `);
    }
};

const restartDriver = (idata) => {
    try {
        console.log("restarting drivers")
        idata.dataArray.forEach((device) => {
            let communicationId = new Date().getTime() + 'restartDriver' + crypto.randomBytes(1).toJSON().data[0];
            let objToSend = {
                type: 'download_device_driver',
                dataArray: [{
                    driverName: device.DRIVER_NAME,
                }],
                userId: "admin@cloudsmaintenance.clouzer.com",
                communicationId: communicationId
            }
            console.log(` soulsystem - quickRequestOperation - restartDriver - action => downlod device driver request - communicationId - ${communicationId} -  -  -  - `);
            mqttWrite('soulSystem/restartdriver', objToSend);
        })
    } catch (error) {
        console.log("error while restarting driver")
    }
}

const readJsonFileData = (filename, cb) => {
    try {
        console.log("initialInstallationScript - readJsonFileData - In the function check hub Status - -  ")
        jsonfile.readFile(filename, function (err, obj) {
            if (err) return console.error(err);
            try {
                console.log('=================Data is there============== ');
                console.log(JSON.stringify(obj));
                cb(obj)
            } catch (e) {
                console.log(` hubMtnOutput - readFile_ERROR #31001 - readFile `, e)
            }
        });
    } catch (error) {
        console.log(`initialInstallationScript - readJsonFileData -  error while reading  jason data  -  -  -  -  ${error}`)
    }
}

const deletefile = (file) => {
    try {
        console.log("initialInstallationScript - deleteJsonfile - In the function check hub Status - -  ")
        fs.unlink(file, (err2) => {
            if (err2)
                console.log(`${new Date().toJSON()} - err : ExecuteUpdates : ${err2}`);
            else
                console.log(`${new Date().toJSON()} - ExecuteUpdates : interface.json file deleted successfully`);
        });
    } catch (error) {
        console.log(`initialInstallationScript - deleteJsonfile -  error while reading  jason data  -  -  -  -  ${error}`)
    }
}

const insertInterface = (cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript - insertInterface - In the function check hub Status - -  `)
        let clientId = "v2admin" + new Date().getTime() + 'DapiclientId' + new Date().getTime();
        let communicationIdfetch = new Date().getTime() + 'checkDriverStatus' + crypto.randomBytes(1).toJSON().data[0];
        let requestData = {
            "data": {
                "requestId": new Date().getTime() + 'checkDriverStatus' + crypto.randomBytes(1).toJSON().data[0],
                "userId": "admin@clouzer.com",
                "clientId": clientId,
            },
            "communicationId": communicationIdfetch,
            "type": "dapi_fetch"
        };
        mqttclient.subscribe(clientId);
        console.log(`${new Date().toJSON()} soulDapi - process - checkDriverStatus - sendData to hubaction/installer topic data is : ${JSON.stringify(requestData)}-  -  -  -  - `);
        mqttWrite("hubAction/installer", requestData);
        Emitter.on(requestData.data.requestId, (err, interfaces) => {
            console.log(`${new Date().toJSON()} - soulDapi - process - checkDriverStatus - response of dapi_fetch : ${JSON.stringify(interfaces)} - - -`);
            let interfaceData = fs.existsSync(`${HOME}db/interface.json`, 'utf-8');
            fs.readFile(`${HOME}db/interface.json`, 'utf8', (err, data) => {
                if (err) {
                    console.error(`${new Date().toJSON()} - Error while  reading the interface.json file : ${JSON.stringify(err)}`);
                    console.log(`${new Date().toJSON()} - interface.json file not present in db folder`)
                    cb()
                    Emitter.emit("increaseCount", { msg: "initsetup : No Need to download drivers from script - - " })
                } else if (data.includes('INTERFACE_ID') && (interfaceData && interfaces && interfaces.hasOwnProperty('dataArray') && interfaces.dataArray.length == 0)) {
                    readJsonFileData(`${HOME}db/interface.json`, (jsonData) => {
                        if (jsonData.length > 0) {
                            let clientIdinsert = "v2admin" + new Date().getTime() + 'DapiclientId' + new Date().getTime();
                            let communicationIdinsert = new Date().getTime() + 'insertInterface' + crypto.randomBytes(1).toJSON().data[0];
                            let requestDatainsert = {
                                "data": {
                                    "requestId": communicationIdinsert,
                                    "userId": "admin@clouzer.com",
                                    "dataArray": jsonData,
                                    "clientId": clientIdinsert
                                },
                                "communicationId": communicationIdinsert,
                                "type": "dapi_insert"
                            };
                            mqttWrite("hubAction/installer", requestDatainsert);
                            Emitter.on(communicationIdinsert, (err1, insertedData) => {
                                console.log(err1);
                                console.log(`${new Date().toJSON()} - data inserted successfully into db -  -  - ${JSON.stringify(insertedData)}  -  - `);
                                restartDriver(insertedData);
                                Emitter.emit("increaseCount", { msg: "initsetup : drivers downloaded successfully" })
                                deletefile()
                                cb()
                            });
                        }
                    })
                }
            });
        });
    } catch (error) {
        console.log(` ${new Date().toJSON()} - error while inserting interface data  -  -  -  -  ${error}`)
    }
}

function getScene(cb) {
    try {
        let arr = []
        console.log("--------------------- getScene ---------------------")
        let request = 'get_scene' + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + Math.floor((Math.random() * 100) + 1) + 'newScript'
        get_scene.data.requestId = request
        get_scene.data.clientId = client
        arr.push(get_scene.data.requestId)
        mqttWrite('hubAction/installer', get_scene)
        Emitter.on('get_scene_hub', (err, respData) => {
            let obj = JSON.parse(respData)
            arr.forEach(element => {
                if (element == obj.requestId) {
                    console.log(`${new Date().toJSON()} - scenes fetched sucessfully`);
                    cb(obj)
                }
            })

        })
    } catch (err) {
        console.log(err)
    }
}

function updateSceneFolder(cb) {
    try {
        let imagesToAssign = [];
        imageTransfer((callback) => {
            if (callback == 1) {
                console.log(`${new Date().toJSON()} - error occured during execution of subProcess`)
                //} else if (callback == 3) {
                //console.log(`error occured while command execution`)
            } else {
                console.log(`${new Date().toJSON()} - localassets/SECN/assets/Scene folder created sucessfully`)
                fs.readdir(HOME + 'localassets/SECN/assets/Scene', (err, fNames) => {
                    fNames.forEach((element, id, arr) => {
                        let name = element.split('.');
                        console.log(` --  Present image Name ${name}`)
                        parsedData.forEach(scene => {
                            if (name[0] == scene.data.dataArray[0].NAME) {
                                console.log(`Present Scene Name is ${scene.data.dataArray[0].NAME} and Present Images are ${element}`)
                                imagesToAssign.push(name[0])
                            }
                        })
                        if (id == arr.length - 1) {
                            console.log(`${new Date().toJSON()} - Calling UPDATESCENE AFTER CREATING NEW FOLDER`)
                            updateScene(imagesToAssign, parsedData, cb);
                            sceneDeletion(fNames)
                        }
                    })
                })

            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - error while creating scene folderrrrrr -  -   -  - ${error}`)
    }
}
let SceneFolderPath = "https://test.clouzer.com/V2HUB/DOCKER/SCENE/Scene.tar.xz"
function folderOperations(cb) {
    let imagesToAssign = []
    getSceneByDeploymentType(sceneData, (data) => {
        parsedData = data
        console.log(`${new Date().toJSON()} - initialInstallationScript - parsedData - ${JSON.stringify(parsedData)} -  -  -  -  - `)
        fs.stat(HOME + 'localassets/SECN', (err, stat) => {
            if (err) {
                console.log(`${new Date().toJSON()} - /localassets/SECN is not present creating new /localassets/SECN folder`)
                fs.mkdir(HOME + 'localassets/' + 'SECN', (merr) => {
                    if (merr) {
                        console.log(`${new Date().toJSON()} - Error while creating new /localassets/SECN folder`)
                    } else {
                        console.log(`${new Date().toJSON()} - /localassets/SECN is created and creating new /localassets/SECN/assets folder`)
                        fs.mkdir(HOME + 'localassets/SECN/' + 'assets', (aerr) => {
                            if (aerr) {
                                console.log(`${new Date().toJSON()} - Error while creating new /localassets/SECN/assets folder`)
                            } else {
                                console.log(`${new Date().toJSON()} - /localassets/SECN/assets is created and creating new /localassets/SECN/assets/Scene folder`)
                                fs.mkdir(HOME + 'localassets/SECN/assets/' + 'Scene', (serr) => {
                                    if (serr) {
                                        console.log(`${new Date().toJSON()} - error while creating /localassets/SECN/assets/Scene`)
                                    } else {
                                        updateSceneFolder(cb)
                                    }
                                })
                            }
    
                        })
    
                    }
                })
            } else {
                fs.stat(HOME + 'localassets/SECN/assets', (err, stat) => {
                    if (err) {
                        console.log(`${new Date().toJSON()} - localassets/SECN/assets is not present creating  localassets/SECN/assets`)
                        fs.mkdir(HOME + 'localassets/SECN/' + 'assets', (aerr) => {
                            if (aerr) {
                                console.log(`${new Date().toJSON()} - Error while creating new /localassets/SECN/assets folder`)
                            } else {
                                console.log(`${new Date().toJSON()} - /localassets/SECN/assets is created and creating new /localassets/SECN/assets/Scene folder`)
                                fs.mkdir(HOME + 'localassets/SECN/assets/' + 'Scene', (serr) => {
                                    if (serr) {
                                        console.log(`${new Date().toJSON()} - error while creating /localassets/SECN/assets/Scene in SECN check `)
                                    } else {
                                        updateSceneFolder(cb)
                                    }
                                })
                            }
                        })
                    } else {
                        fs.stat(HOME + 'localassets/SECN/assets/Scene', (err, stat) => {
                            if (err) {
                                console.log(`${new Date().toJSON()} - /localassets/SECN/assets/Scene is not present and creating new /localassets/SECN/assets/Scene folder`)
                                fs.mkdir(HOME + 'localassets/SECN/assets/' + 'Scene', (serr) => {
                                    if (serr) {
                                        console.log(`${new Date().toJSON()} - error while creating /localassets/SECN/assets/Scene in SECN check `)
                                    } else {
                                        console.log(`${new Date().toJSON()} - Scene is present copying files `)
                                        updateSceneFolder(cb)
                                    }
                                })
                            } else {
                                console.log(`localassets/SceneImages is already present `)
                                fs.readdir(HOME + 'localassets/SECN/assets/Scene', (err, fNames) => {
                                    if (err) {
                                        console.log(`${new Date().toJSON()} - error while reading directory`)
                                    } else {
                                        console.log(`${new Date().toJSON()} - localassets/SceneImages folder reading`)
                                        fNames.forEach((element, id, arr) => {
                                            let name = element.split('.');
                                            console.log(`${new Date().toJSON()} - Present image Name ${name}`)
                                            parsedData.forEach(scene => {
                                                if (name[0] == scene.data.dataArray[0].NAME) {
                                                    console.log(`${new Date().toJSON()} - Present Scene Name is ${scene.data.dataArray[0].NAME} and Present Images are ${element}`)
                                                    imagesToAssign.push(name[0])
                                                }
                                            })
    
                                            if (id == arr.length - 1) {
                                                if (imagesToAssign.length == 0) {
                                                    updateSceneFolder(cb)
                                                }
                                                console.log(`${new Date().toJSON()} - Calling UPDATESCENE AFTER VERIFYING FOLDER`)
                                                //console.log(parsedData)
                                                updateScene(imagesToAssign, parsedData, cb)
                                                sceneDeletion(fNames)
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
    })
}

function imageTransfer(cb) {
    let callb;
    exec(`
        cd /home/linaro
		wget ${SceneFolderPath}
        rm -rf /home/linaro/localassets/SECN/assets/Scene
		tar -xf /home/linaro/Scene.tar.xz
        mv /home/linaro/Scene /home/linaro/localassets/SECN/assets
        chown -R ${OWNER}:${GROUP} /home/linaro/localassets
        sudo chmod -R 777 /home/linaro/localassets
		rm -f /home/linaro/Scene.tar.xz`, (err, sucess, cerr) => {
        if (err) {
            console.log(err)
            callb = 1;
            cb(callb)
        }
        if (cerr) {
            console.log(cerr)
        }
        console.log(sucess)
        callb = 2;
        cb(callb)

    })
}

function deleteScene(sId, sceneToadd, imggeArr, cb) {
    try {
        if (sId.length > 0) {
            console.log('SCENE ID TO BE DELETE after try ' + sId)
            let reqArr = []
            let delete_scene = {
                type: 'delete_scene',
                data: {
                    queryData: {
                        ID: ""
                    },
                    requestId: "",
                    userId: 'admin@clouzer.com',
                    clientId: ""
                }
            }
            console.log("--------------------- deleteScene ---------------------")
            console.log('SCENE ID TO BE DELETE ' + sId)
            sId.forEach((element, id, arr) => {
                console.log("--------------------- sId  --------------------- ************** ")
                let request = 'Scene.delete.test_' + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + Math.floor((Math.random() * 100) + 1) + 'newScript'
                delete_scene.data.queryData.ID = element
                delete_scene.data.requestId = request
                delete_scene.data.clientId = "v2admin" + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + Math.floor((Math.random() * 100) + 1) + 'newScript'
                reqArr.push(delete_scene.data.requestId)
                console.log("--------------------- deleteSceneRequest --------------------- ************** " + delete_scene)
                mqttWrite('hubAction/installer', delete_scene)
            })
            let count = 0;
            Emitter.on('delete_scene_hub', (err, respData) => {
                console.log("--------------------- responseReceived --------------------- ************** " + reqArr)
                reqArr.forEach((reqId, id1, arr1) => {
                    if (respData.requestId == reqId) {
                        console.log(respData)
                        console.log(`scene ${respData.dataArray[0].NAME} deleted sucessfully`);
                        count++;
                        console.log(`---------------------count ${id1} arr ${arr1.length - 1}---------------------`)
                        if (id1 == arr1.length - 1) {
                            console.log("--------------------- All Scenes Deleted successfully ---------------------")
                            if (sceneToadd.length > 0) {
                                sceneToadd.forEach(element => {
                                    console.log("--------------------- requestsent ---------------------")
                                    addScene('', element, imggeArr, cb)
                                })
                            }
                        }
                    }
                })
            })
        } else {
            addScene(sceneToadd, '', imggeArr, cb)
        }
    } catch (err) {
        console.log(err)
    }
}

const SceneDelete = (sId) => {
    try {
        console.log(`soulsystem - initialInstallationScript - SceneDelete  -  -  - `)
        if (sId.length > 0) {
            let reqArr = []
            let delete_scene = {
                type: 'delete_scene',
                data: {
                    queryData: {
                        ID: ""
                    },
                    requestId: "",
                    userId: 'admin@clouzer.com',
                    clientId: ""
                }
            }
            console.log(`soulsystem - initialInstallationScript - SceneDelete  - scene id s which has to delete  ${sId}-  - `)
            sId.forEach((element, id, arr) => {
                let request = 'Scene.delete.test_' + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + Math.floor((Math.random() * 100) + 1) + 'newScript'
                delete_scene.data.queryData.ID = element
                delete_scene.data.requestId = request
                delete_scene.data.clientId = "v2admin" + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + Math.floor((Math.random() * 100) + 1) + 'newScript'
                reqArr.push(delete_scene.data.requestId)
                console.log(`soulsystem - initialInstallationScript - SceneDelete  - scene delete request - delete_scene : ${JSON.stringify(delete_scene)} -  - `)
                mqttWrite('hubAction/installer', delete_scene)
            })
            let count = 0;
            Emitter.on('delete_scene_hub', (err, respData) => {
                console.log(`soulsystem - initialInstallationScript - SceneDelete  - responseReceived - delete_scene_hub : ${reqArr} -`)
                reqArr.forEach((reqId, id1, arr1) => {
                    if (respData.requestId == reqId) {
                        console.log(respData)
                        console.log(`soulsystem - initialInstallationScript - SceneDelete - scene ${respData.dataArray[0].NAME} deleted sucessfully`);
                        count++;
                        console.log(`soulsystem - initialInstallationScript - SceneDelete - count ${id1} arr ${arr1.length - 1} - - -`)
                        if (id1 == arr1.length - 1) {
                            console.log("soulsystem - initialInstallationScript - SceneDelete -  All Scenes Deleted successfully - - -")
                        }
                    }
                })
            })
        }
    } catch (err) {
        console.log(`soulsystem - initialInstallationScript - SceneDelete  - error ${err}  -  - `)
    }
}


function updateScene(imagesArr, obj, cb) {
    try {
        let sceneDelArr = []
        let sceneToAdd = []
        getScene((sceneData) => {
            if (sceneData.dataArray.length > 0) {
                obj.forEach((parsedEle, parseId, parseArr) => {
                    let pcnt = 0;
                    let dcnt = 0;
                    sceneData.dataArray.forEach((element, id, arr) => {
                        if (element.NAME == parsedEle.data.dataArray[0].NAME) {
                            pcnt++;
                            if (parsedEle.data.dataArray[0].CML_VERSION == element.CML_VERSION) {
                                console.log(`${new Date().toJSON()} - scene versions are same, not need to update scene`)
                                if (parseId == parseArr.length - 1) {
                                    Emitter.emit("increaseCount", { msg: "initsetup : scenes already present" })
                                    cb()
                                }
                            } else {
                                console.log(`${new Date().toJSON()} - scene name is same but scene versions are not same`)
                                dcnt++;
                                sceneDelArr.push(element.ID)
                            }
                        }
                        if (id == arr.length - 1 && (pcnt == 0 || dcnt != 0)) {
                            sceneToAdd.push(parsedEle)
                        }
                    })
                    if (parseId == parseArr.length - 1) {
                        if (sceneToAdd.length > 0) {
                            checkHubMode(() => {
                                console.log(`${new Date().toJSON()} --------------------- calling from unmatched names updateScene ---------------------`)
                                console.log(sceneToAdd)
                                deleteScene(sceneDelArr, sceneToAdd, imagesArr, cb)
                            })
                        }
                    }
                })
            } else {
                checkHubMode(() => {
                    console.log(`${new Date().toJSON()} - scene table is empty adding new scenes`)
                    addScene(obj, '', imagesArr, cb)
                })
            }
        })

    } catch (err) {
        console.log(`${new Date().toJSON()} - updateScene - error ${err} `)
    }
}


function addScene(obj, ele, imggeArr, cb) {
    try {
        console.log("--------------------- inside add scene ---------------------" + imggeArr)
        if (obj) {
            let req = []
            console.log("--------------------- inside add scene full object---------------------")
            obj.forEach(element2 => {
                console.log("--------------------- inside add scene full object for loop---------------------")
                imggeArr.forEach(imgName => {
                    if (imgName == element2.data.dataArray[0].NAME) {
                        console.log("--------------------- adding new scene ---------------------")
                        let path = 'assets/Scene/' + imgName + '.' + 'jpeg'
                        let arr = []
                        arr.push(path)//arry to store in future
                        element2.data.requestId = "add_scene@1234" + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + Math.floor((Math.random() * 100) + 1) + "newScript"
                        //element2.data.dataArray[0].NAME = arr.push(path)
                        console.log(`--------------------- Checking image name --------------------- ${path}`)
                        Object.assign(element2.data.dataArray[0], { CML_LOCAL_IMG_PATH: arr })
                        element2.data.clientId = "v2admin" + new Date().getTime() + 'insertInterface' + crypto.randomBytes(1).toJSON().data[0];
                        req.push(element2.data.requestId)
                        mqttWrite('hubAction/installer', element2)
                    }
                })
            });

            Emitter.on('add_scene_hub', (err, respData) => {
                if (JSON.parse(respData).type == 'add_scene_hub') {
                    console.log(`--------------------- checkResponse of --------------------- ${req}`)
                    req.forEach(requestID => {
                        if (requestID == JSON.parse(respData).requestId) {
                            console.log(`scene ${JSON.parse(respData).dataArray[0].NAME} added sucessfully`);
                        }
                    })
                    if (req.includes(JSON.parse(respData).requestId)) {
                        console.log(`scene ${JSON.parse(respData).dataArray[0].NAME} added sucessfully`);
                        req.splice(JSON.parse(respData).requestId, 1)
                        if (req.length == 0) {
                            Emitter.emit("increaseCount", { msg: "initsetup : scenes added sucessfully" })
                            cb()
                        }
                    }
                }
            })
        }
        if (ele) {
            let req = []
            imggeArr.forEach(imgName => {
                if (imgName == ele.data.dataArray[0].NAME) {
                    console.log("--------------------- Updating scene ---------------------")
                    let path = 'assets/Scene/' + imgName + '.' + 'jpeg'
                    let arr = []
                    arr.push(path) //arry to store in future
                    ele.data.requestId = "add_scene@1234" + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + Math.floor((Math.random() * 100) + 1) + 'newScript'
                    //ele.data.dataArray[0].NAME = arr.push(path)
                    console.log(`--------------------- Checking image name --------------------- ${path}`)
                    Object.assign(ele.data.dataArray[0], { CML_LOCAL_IMG_PATH: arr })
                    ele.data.clientId = "v2admin" + new Date().getTime() + 'insertInterface' + crypto.randomBytes(1).toJSON().data[0];
                    req.push(ele.data.requestId)
                    mqttWrite('hubAction/installer', ele)
                }
            })
            Emitter.on('add_scene_hub', (err, respData) => {
                if (JSON.parse(respData).type == 'add_scene_hub') {

                    req.forEach(requestID => {
                        if (requestID == JSON.parse(respData).requestId) {
                            console.log(`scene ${JSON.parse(respData).dataArray[0].NAME} added sucessfully`);
                        }
                    })
                    if (req.includes(JSON.parse(respData).requestId)) {
                        console.log(`scene ${JSON.parse(respData).dataArray[0].NAME} added sucessfully`);
                        req.splice(JSON.parse(respData).requestId, 1)
                        if (req.length == 0) {
                            Emitter.emit("increaseCount", { msg: "initsetup : scenes added sucessfully" })
                            cb()
                        }
                    }

                }
            })
        }
    } catch (err) {
        console.log(err)
    }
}


function updateDeviceFunc(pData, cb) {
    try {
        console.log("--------------------- updateDeviceFunc ---------------------")
        pData.forEach(element => {
            console.log("--------------------- updateDeviceFunc ---------------------##############");
            let assigndimmerToPico = {
                "data": {
                    "requestId": "abcdXYZ",
                    "userId": "admin@clouzer.com",
                    "clientId": "v2admin",
                    "queryData": {
                        "DEVICE_ID": []
                    },
                    "essentialList": {
                        "add_members": [],
                        "type": "device",
                        "connection": "softlink"
                    },
                    "CallerInfo": {
                        "source": [
                            "UI"
                        ],
                        "caller": "onclick_event"
                    }
                },
                "type": "update_device"
            }
            assigndimmerToPico.data.queryData.DEVICE_ID.push(element.pico.DEVICE_ID)

            element.dimmers.forEach(dimmerDevices => {
                assigndimmerToPico.data.essentialList.add_members.push(dimmerDevices.DEVICE_ID);
            })
            if (assigndimmerToPico.data.queryData.DEVICE_ID.length > 0 && assigndimmerToPico.data.essentialList.add_members.length > 0) {
                mqttWrite('hubAction/installer', assigndimmerToPico)
            }
            console.log(assigndimmerToPico + " dimmer assigning object")
            Emitter.on(assigndimmerToPico.data.requestId, (err, respData) => {
                let obj = JSON.parse(respData)
                if (obj.type == "add_device_memebers_hub") {
                    console.log('DEVICES ASSIGNED SUCCESSFULLY................');
                }
            })
            cb()
        })

    } catch (err) {
        console.log(err)
    }
}

function updateButtonFunc(picoData, cb) {
    try {
        console.log("--------------------- update button function ---------------------")
        console.log("pico data is " + picoData)
        let updateButton = {
            "data": {
                "requestId": "abcdrty",
                "userId": "admin@clouzer.com",
                "clientId": "v2admin",
                "dataArray": []
            },
            "type": "update_button"
        }
        picoData.forEach(element => {
            let upButton = {
                "DEVICE_ID": element.buttons[1].DEVICE_ID,
                "CML_TYPE": "button",
                "CML_SUB_TYPE": "scene",
                "SCENE_ID": 248,
                "VALUE": -1,
                "ACTION_TYPE": "set_scene"
            }
            updateButton.data.dataArray.push(upButton);
        })
        mqttWrite('hubAction/installer', updateButton)
        console.log(updateButton + " update button object")
        Emitter.on(updateButton.data.requestId, (err, respData) => {
            let obj = JSON.parse(respData)
            if (obj.type == "update_button_hub") {
                console.log('********************BUTTONS UPDATED SUCCESSFULLY');
            } else {
                console.log('********************ERROR WHILE UPDATING BUTTONS');
            }
        })
    } catch (err) {
        console.log(err)
    }
}

let get_device = {
    "data": {
        "requestId": "",
        "userId": "admin@clouzer.com",
        "clientId": "",
        "dataArray": [
            {},
            {}
        ],
        "updateData": {},
        "essentialList": {
            "provisioned": true
        },
        "CallerInfo": {
            "source": [
                "UI"
            ],
            "caller": "onclick_event"
        }
    },
    "type": "get_device"
}

function getDevices(get_devices, cb) {
    try {
        console.log(" in function get devices")
        let arr = []
        get_devices.data.requestId = "get_device@1234" + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + Math.floor((Math.random() * 100) + 1) + 'newScript'
        get_devices.data.clientId = "v2admin" + new Date().getTime() + "r1" + Math.floor((Math.random() * 100) + 1) + "r2" + Math.floor((Math.random() * 100) + 1) + 'newScript'
        arr.push(get_devices.data.requestId)
        console.log(" in function get devices -- sending request")
        mqttclient.subscribe(get_devices.data.clientId);
        mqttWrite('hubAction/installer', get_devices)
        Emitter.on(get_devices.data.requestId, (err, respData) => {
            console.log(" in function get devices -- checking response")
            arr.forEach(reqId => {
                if (reqId == respData.requestId) {
                    console.log(" in function get devices -- received response")
                    cb(respData)
                }
            })
        })
    } catch (err) {
        console.log(err)
    }
}

function autoProvisionHandler(obj) {
    try {
        console.log("--------------------- autoProvisionHandler ---------------------")
        let autoProvisionObj = JSON.parse(obj)
        let picoData = []
        let dimmerData = []
        let dimmer;
        if (autoProvisionObj.dataArray[0].CML_MANUFACTURER_NAME == 'lutron') {
            autoProvisionObj.dataArray.forEach((element, id, arr) => {
                if (element.CML_MANUFACTURER_NAME == 'lutron' && element.CML_SUB_TYPE == 'KEYPAD' && (element.CML_SUPPORTED_TYPE == 'Light')) {
                    console.log("--------------------- Pico found ---------------------")
                    let buttonArr = [];

                    autoProvisionObj.dataArray.forEach((element1, id1, arr1) => {

                        if (element && element1.CML_SWITCH_CNTR_ID == element.CML_SERIAL_ID) {
                            console.log("button " + element1.CML_SWITCH_CNTR_ID)
                            buttonArr.push(element1);
                        }
                        if (id1 === arr1.length - 1) {
                            picoData.push({ pico: element, buttons: buttonArr });
                        }
                    })
                }
                if (element.CML_MANUFACTURER_NAME == 'lutron' && element.CML_SUB_TYPE == 'KEYPAD' && (element.CML_SUPPORTED_TYPE == 'Scene' || element.CML_SUPPORTED_TYPE == 'SCENE')) {
                    console.log("--------------------- Pico found ---------------------", element)
                    let buttonArr = [];
                    autoProvisionObj.dataArray.forEach((element2, id1, arr1) => {

                        if (element && element2.CML_SWITCH_CNTR_ID == element.CML_SERIAL_ID) {
                            console.log("button " + element2.CML_SWITCH_CNTR_ID)
                            buttonArr.push(element2);
                        }
                        if (id1 === arr1.length - 1) {
                            picoData.push({ pico: element, buttons: buttonArr });
                        }
                    })
                }
                if (element.CML_MANUFACTURER_NAME == "lutron" && element.CML_SUB_TYPE == "SMART_DIMMER") {
                    dimmer = element
                    dimmerData.push(element)
                    autoProvisionObj.dataArray.forEach((element3, id, arr) => {
                        if (dimmer && dimmer.CML_SERIAL_ID == element3.CML_SWITCH_CNTR_ID) {
                            dimmerData.push(element3)
                        } else {
                            console.log('dimmer is not present')
                        }
                    })
                }

                if (id === arr.length - 1) {
                    picoData.forEach((element4, id1, arr1) => {
                        if (element4.pico) {
                            let target = element4.pico.TARGET;
                            const myArray = target.split("/");
                            let roomTarget = myArray[0] + "/" + myArray[1] + "/" + myArray[2] + "/" + myArray[3];
                            console.log(roomTarget + "rooms target is present   ");
                            Object.assign(element4, { dimmers: [] });
                            dimmerData.forEach((dimmerEle, id, arr) => {
                                let dimtarget = dimmerEle.TARGET
                                let dimsplit = dimtarget.split('/')
                                let dimTargetFinal = dimsplit[0] + "/" + dimsplit[1] + "/" + dimsplit[2] + "/" + dimsplit[3];
                                console.log("TARGET OF DIMMER ELEMENT " + dimmerEle.TARGET)
                                if (dimmerEle.hasOwnProperty('TARGET') && dimTargetFinal == roomTarget) {
                                    element4.dimmers.push(dimmerEle);
                                }
                            })
                        }
                    })

                    console.log("dimmer data checking " + picoData[0].dimmers)
                }
            })
            updateDeviceFunc(picoData, () => {
                console.log(" in function updateDeviceFunc-- checking response for lutron")
            })
        } else if (autoProvisionObj.dataArray[0].CML_MANUFACTURER_NAME == 'crestron') {
            picoData = []
            dimmerData = []
            getDevices(get_device, (obj) => {
                console.log("get devices -- callback")
                obj.dataArray.forEach(element => {
                    console.log("get devices -- checking response")
                    if (element.CML_MANUFACTURER_NAME == 'lutron' && element.CML_SUB_TYPE == 'KEYPAD' && (element.CML_SUPPORTED_TYPE == 'Scene' || element.CML_SUPPORTED_TYPE == 'SCENE' || element.CML_SUPPORTED_TYPE == 'Light')) {
                        console.log("--------------------- Pico found ---------------------", element)
                        picoData.push({ pico: element });
                    }
                })
                autoProvisionObj.dataArray.forEach((dimmers, id, arr) => {
                    console.log("checking crestron smart dimmer")
                    if (dimmers.CML_MANUFACTURER_NAME == "crestron" && dimmers.CML_SUB_TYPE == "SMART_DIMMER") {
                        console.log("found crestron smart dimmer")
                        dimmer = dimmers
                        dimmerData.push(dimmers)
                        autoProvisionObj.dataArray.forEach((element3, id, arr) => {
                            if (dimmer && dimmer.CML_SERIAL_ID == element3.CML_SWITCH_CNTR_ID) {
                                console.log("found crestron smart dimmer found non smart light")
                                dimmerData.push(element3)
                            }
                        })
                    }
                    if (id === arr.length - 1) {
                        console.log("traversing autoprovision done")
                        picoData.forEach((element4, id1, arr1) => {
                            if (element4.pico) {
                                console.log("checking pico data")
                                let target = element4.pico.TARGET;
                                const myArray = target.split("/");
                                let roomTarget = myArray[0] + "/" + myArray[1] + "/" + myArray[2] + "/" + myArray[3];
                                console.log(roomTarget + "rooms target is present   ");
                                Object.assign(element4, { dimmers: [] });
                                dimmerData.forEach((dimmerEle, id, arr) => {
                                    console.log("checking for dimmer")
                                    let dimtarget = dimmerEle.TARGET
                                    let dimsplit = dimtarget.split('/')
                                    let dimTargetFinal = dimsplit[0] + "/" + dimsplit[1] + "/" + dimsplit[2] + "/" + dimsplit[3];
                                    console.log("TARGET OF DIMMER ELEMENT " + dimmerEle.TARGET)
                                    if (dimmerEle.hasOwnProperty('TARGET') && dimTargetFinal == roomTarget) {
                                        element4.dimmers.push(dimmerEle);
                                    }
                                })
                            }

                            if (id1 == arr1.length - 1) {
                                console.log("dimmer data checking " + picoData[0].dimmers)
                                updateDeviceFunc(picoData, () => {
                                    console.log(" in function updateDeviceFunc -- checking response for Crestron")
                                })
                            }
                        })
                    }

                })

            })

        }
    } catch (err) {
        console.log(err)
    }
}

Emitter.on('auto_provision_device_hub', (err, respData) => {
    autoProvisionHandler(respData);
})

/*const hardreset = () => {
    try {
        console.log("initialInstallationScript - hardreset - In the function check hub Status - -  ")
        let clientId = "v2admin" + new Date().getTime() + 'hardreset' + new Date().getTime();
        let communicationIdfetch = new Date().getTime() + 'hardreset' + crypto.randomBytes(1).toJSON().data[0];
        let requestData = {
            "data": {
                "requestId": new Date().getTime() + 'hardreset' + crypto.randomBytes(1).toJSON().data[0],
                "userId": "admin@clouzer.com",
                "clientId": clientId,
            },
            "communicationId": communicationIdfetch,
            "type": "portal_hard_reset"
        };
        mqttclient.subscribe(clientId);
        console.log(` soulDapi - process - hardreset - sendData to hubaction/installer topic data is : ${JSON.stringify(requestData)}-  -  -  -  - `);
        mqttWrite("hubAction/installer", requestData);
        Emitter.on(requestData.data.requestId, (interfaces) => {
            console.log(` soulDapi - process - hardreset - response of dapi_fetch : ${JSON.stringify(interfaces)} - - -`);            
        });
    } catch (error) {
        console.log(`error while hardreset interface data  -  -  -  -  ${error}`)
    }
}*/

const checkTemplateFolder = (cb) => {
    try {
        console.log(` 1111111111111111 `)
        let names = []
        fs.readdir(HOME + 'Docker_scripts/soulScripts', (err, htmlNames) => {
            htmlNames.forEach(ele => {
                if (ele.includes('.html')) {
                    console.log(` 1111111111111111 hrere`)
                    names.push(ele)
                }
            })
        })
        let templatePath = HOME + 'Docker_scripts/soulScripts/emailTemplate.html'
        fs.stat(HOME + 'localassets/templates', (err) => {
            if (err) {
                console.log(` 2222222222222222 `)
                fs.mkdir(HOME + 'localassets/' + 'templates', (err) => {
                    if (err) {
                        console.log(` 3333333333333333333333333 `)
                        console.log(`error while creating ${HOME + 'localassets/templates'} - ${err}`)
                    } else {
                        console.log(` 44444444444444 `)
                        names.forEach((ele, id, arr) => {
                            console.log(` 44444444444444 herere `)

                            fs.readFile(HOME + 'Docker_scripts/soulScripts/' + ele, (err, data) => {
                                if (err) {
                                    console.log(` 55555555555555555555555555 `)
                                    console.log(`error while reading file ${HOME + 'Docker_scripts/soulScripts/' + ele} - ${err}`)
                                } else {
                                    console.log(` 666666666666666666666 `)
                                    fs.writeFile(HOME + 'localassets/templates/' + ele, data, (err) => {
                                        console.log(`error while writing file ${err}`)
                                    })
                                    if (id == arr.length - 1) {
                                        cb()
                                    }
                                }
                            })
                        })
                    }
                })
            } else {
                console.log(` 7777777777777 `)
                names.forEach((ele, id, arr) => {
                    console.log(` 7777777777777 herere`)
                    fs.stat(HOME + 'localassets/templates/' + ele, (err) => {
                        if (err) {
                            console.log(` 88888888888888 `)
                            fs.readFile(HOME + 'Docker_scripts/soulScripts/' + ele, (err, data) => {
                                if (err) {
                                    console.log(` 9999999999999 `)
                                    console.log(`error while reading file ${HOME + 'Docker_scripts/soulScripts/' + ele} - ${err}`)
                                } else {
                                    console.log(` 10101001010101010 `)
                                    fs.writeFile(HOME + 'localassets/templates/' + ele, data, (err) => {
                                        console.log(`error while writing file ${err}`)
                                    })
                                    if (id == arr.length - 1) {
                                        cb()
                                    }
                                }
                            })
                        } else {
                            console.log(` 11 11 11 11 11 11 11 11 `)
                            if (id == arr.length - 1) {
                                cb()
                            }
                        }
                    })
                })
            }
        })
    } catch (err) {
        console.log(`- checkTemplateFolder - ${err}`)
    }
}

let propertiesObj = {
    "crestron": {
        "SHADE": {
            "actions": {
                "CML_POWER_SUPPORTED": 1,
                "CML_BOTTOM_TO_TOP_LEVEL_SUPPORTED": 1
            },
            "properties": {
                "CML_MIN_SETPOINT": 0,
                "CML_MAX_SETPOINT": 100
            }
        },
        "SMART_DIMMER": {
            "actions": {
                "CML_POWER_SUPPORTED": 1,
                "CML_BRIGHTNESS_SUPPORTED": 1
            },
            "properties": {
                "CML_MIN_SETPOINT": 0,
                "CML_MAX_SETPOINT": 100
            }
        },
        "SWITCH": {
            "actions": {
                "CML_POWER_SUPPORTED": 1
            },
            "properties": {}
        },
        "MUSIC": {
            "actions": {
                "CAN_LOAD_PLAYLIST": 1,
                "CAN_SET_VOLUME": 1,
                "CAN_CHANGE_MODE": 1,
                "CAN_GET_SEEK_POS": 1,
                "CAN_SET_SEEK_POS": 1,
                "CAN_PLAY_SPECIFIC_SONG": 1,
                "CAN_PLAY_PAUSE_SONG": 1,
                "CAN_GET_PLAYLISTS": 1,
                "CAN_GET_SONGS_BY_PLAYLIST": 1,
                "SUPPORTS_DEFAULT_PLAYLIST": 1,
                "CAN_NEXT_PREV_SONG": 1,
                "CAN_MUTE_UNMUTE": 1
            },
            "properties": {
                "CML_MIN_SETPOINT": 0,
                "CML_MAX_SETPOINT": 100
            }
        },
        "SENSOR": {
            "actions": {},
            "properties": {}
        }
    },
    "lutron": {
        "KEYPAD": {
            "actions": {},
            "properties": {
                "WATT": 7
            }
        },
        "SWITCH": {
            "actions": {
                "CML_POWER_SUPPORTED": 1
            },
            "properties": {
                "WATT": 7
            }
        },
        "SMART_DIMMER": {
            "actions": {
                "CML_POWER_SUPPORTED": 1,
                "CML_BRIGHTNESS_SUPPORTED": 1
            },
            "properties": {
                "WATT": 7
            }
        }
    },
    "sonos": {
        "MUSIC": {
            "actions": {
                "CAN_LOAD_PLAYLIST": 1,
                "CAN_SET_VOLUME": 1,
                "CAN_CHANGE_MODE": 1,
                "CAN_GET_SEEK_POS": 1,
                "CAN_SET_SEEK_POS": 1,
                "CAN_PLAY_SPECIFIC_SONG": 1,
                "CAN_PLAY_PAUSE_SONG": 1,
                "CAN_GET_PLAYLISTS": 1,
                "CAN_GET_SONGS_BY_PLAYLIST": 1,
                "SUPPORTS_DEFAULT_PLAYLIST": 1,
                "CAN_NEXT_PREV_SONG": 1,
                "CAN_MUTE_UNMUTE": 1
            },
            "properties": {
                "CML_MIN_SETPOINT": 0,
                "CML_MAX_SETPOINT": 100
            }
        }
    }
}





let crestron = [
    {
        "device": {
            "CML_SERIAL_ID": "crestron_1049",
            "MODEL_NUMBER": "crestron",
            "CML_SUB_TYPE": "HVAC"
        },
        "actions": {
            "CML_MODE_SUPPORTED": 1,
            "CML_FANSPEED_SUPPORTED": 1,
            "CML_LOWERPOINT_SUPPORTED": 1,
            "CML_HIGHERPOINT_SUPPORTED": 1
        },
        "properties": {
            "CML_HVAC_SUPPORTED_MODES": [
                0,
                1,
                2,
                3
            ],
            "CML_HVAC_SUPPORTED_FANSPEEDS": [
                0,
                1
            ],
            "CML_SET_POINT_LIMIT": 5,
            "MIN_HEAT_SETPOINT": 38,
            "MAX_HEAT_SETPOINT": 89,
            "MIN_COOL_SETPOINT": 59,
            "MAX_COOL_SETPOINT": 99
        }
    },
    {
        "device": {
            "CML_SERIAL_ID": "crestron_1067",
            "MODEL_NUMBER": "crestron",
            "CML_SUB_TYPE": "HVAC"
        },
        "actions": {
            "CML_MODE_SUPPORTED": 1,
            "CML_FANSPEED_SUPPORTED": 1,
            "CML_LOWERPOINT_SUPPORTED": 1,
            "CML_HIGHERPOINT_SUPPORTED": 1,
            "CML_AUXHEATPOINT_SUPPORTED": 1
        },
        "properties": {
            "CML_HVAC_SUPPORTED_MODES": [
                0,
                1,
                7,
                2,
                3
            ],
            "CML_HVAC_SUPPORTED_FANSPEEDS": [
                0,
                1
            ],
            "CML_SET_POINT_LIMIT": 5,
            "MIN_HEAT_SETPOINT": 38,
            "MAX_HEAT_SETPOINT": 89,
            "MIN_COOL_SETPOINT": 59,
            "MAX_COOL_SETPOINT": 99,
            "MIN_AUXHEAT_SETPOINT": 38,
            "MAX_AUXHEAT_SETPOINT": 89
        }
    },
    {
        "device": {
            "CML_SERIAL_ID": "crestron_1016",
            "MODEL_NUMBER": "crestron",
            "CML_SUB_TYPE": "HVAC"
        },
        "actions": {
            "CML_MODE_SUPPORTED": 1,
            "CML_FANSPEED_SUPPORTED": 1,
            "CML_LOWERPOINT_SUPPORTED": 1,
            "CML_HIGHERPOINT_SUPPORTED": 1
        },
        "properties": {
            "CML_HVAC_SUPPORTED_MODES": [
                0,
                1,
                2,
                3
            ],
            "CML_HVAC_SUPPORTED_FANSPEEDS": [
                0,
                1
            ],
            "CML_SET_POINT_LIMIT": 5,
            "MIN_HEAT_SETPOINT": 38,
            "MAX_HEAT_SETPOINT": 89,
            "MIN_COOL_SETPOINT": 59,
            "MAX_COOL_SETPOINT": 99
        }
    },
    {
        "device": {
            "CML_SERIAL_ID": "crestron_1055",
            "MODEL_NUMBER": "crestron",
            "CML_SUB_TYPE": "HVAC"
        },
        "actions": {
            "CML_MODE_SUPPORTED": 1,
            "CML_FANSPEED_SUPPORTED": 1,
            "CML_LOWERPOINT_SUPPORTED": 1,
            "CML_HIGHERPOINT_SUPPORTED": 1
        },
        "properties": {
            "CML_HVAC_SUPPORTED_MODES": [
                0,
                1,
                2,
                3
            ],
            "CML_HVAC_SUPPORTED_FANSPEEDS": [
                0,
                1
            ],
            "CML_SET_POINT_LIMIT": 5,
            "MIN_HEAT_SETPOINT": 38,
            "MAX_HEAT_SETPOINT": 89,
            "MIN_COOL_SETPOINT": 59,
            "MAX_COOL_SETPOINT": 99
        }
    },
    {
        "device": {
            "CML_SERIAL_ID": "crestron_1061",
            "MODEL_NUMBER": "crestron",
            "CML_SUB_TYPE": "HVAC"
        },
        "actions": {
            "CML_MODE_SUPPORTED": 1,
            "CML_FANSPEED_SUPPORTED": 1,
            "CML_LOWERPOINT_SUPPORTED": 1,
            "CML_HIGHERPOINT_SUPPORTED": 1
        },
        "properties": {
            "CML_HVAC_SUPPORTED_MODES": [
                0,
                1,
                2,
                3
            ],
            "CML_HVAC_SUPPORTED_FANSPEEDS": [
                0,
                1
            ],
            "CML_SET_POINT_LIMIT": 5,
            "MIN_HEAT_SETPOINT": 38,
            "MAX_HEAT_SETPOINT": 89,
            "MIN_COOL_SETPOINT": 59,
            "MAX_COOL_SETPOINT": 99
        }
    }
]

let finalObj =
{
    "communicationId": "1695822244953updateDeviceProperties30",
    "type": "deviceProps",
    "data": [],
    "CallerInfo": {
        "source": [],
        "caller": "soulHubAction",
        "portalAction": true
    }
}

//   let updateProperties = (propArr) => {
//     try {
//         console.log('updateProperties ===')
//         propArr.forEach((ele, id, arr) => {
//             let objectKeys = Object.keys(propertiesObj)
//           // if(id == arr.length - 1){
// 	console.log("object keysssssssssss")
// 	//	console.log()
// 		if(objectKeys.includes(ele.device.CML_MANUFACTURER_NAME)){
// 			console.log("my objjjjjjjjjjjjjjjjjjjjjjjjjjj",propertiesObj[ele.device.CML_MANUFACTURER_NAME][ele.device.CML_SUB_TYPE])
// 			  //let deviceTypeKeys = Object.keys(propertiesObj[ele.device.CML_MANUFACTURER_NAME][ele.device.CML_SUB_TYPE])
// 			                if(propertiesObj[ele.device.CML_MANUFACTURER_NAME][ele.device.CML_SUB_TYPE]){
// 						                    Object.assign(ele, propertiesObj[ele.device.CML_MANUFACTURER_NAME][ele.device.CML_SUB_TYPE])
//                 console.log(`herere222222222222222222 id : ${id} : arr.length : ${arr.length}`)
//              //   Object.assign(ele, propertiesObj[ele.device.CML_MANUFACTURER_NAME])
//                 finalObj.data.push(ele)
// 					}
// 		}
//                 if(id == arr.length - 1){
//                     mqttWrite('python/deviceControlProperties', finalObj)
//                     Emitter.on(finalObj.communicationId, (err, respData) => {
//                         console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!___' + respData.data.length)
//                         if(respData.data.length > 0){
//                             console.log('data inserted sucessfully')
//                             changeMode(change_mode, 'CONFIG_COMPLETE')
//                         }
//                     })
//                 }
//             //}
//         })
//     } catch (error) {
//         console.log(`- updateProperties - ${error}`)
//     }

//   }


let updateProperties = (propArr) => {
    try {
        console.log('updateProperties functiona called')
        propArr.forEach((ele, id, arr) => {
            let objectKeys = Object.keys(propertiesObj)
            if (objectKeys.includes(ele.device.CML_MANUFACTURER_NAME)) {
                console.log('write data into finalObj')
                if (propertiesObj[ele.device.CML_MANUFACTURER_NAME][ele.device.CML_SUB_TYPE]) {
                    Object.assign(ele, propertiesObj[ele.device.CML_MANUFACTURER_NAME][ele.device.CML_SUB_TYPE])
                    finalObj.data.push(ele)
                    finalObj.push(crestron)
                }
            }
            if (id == arr.length - 1) {
                mqttWrite('python/deviceControlProperties', finalObj)
                Emitter.on(finalObj.communicationId, (err, respData) => {
                    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!___' + respData.data.length)
                    if (respData.data.length > 0) {
                        console.log('data inserted sucessfully')
                        changeMode(change_mode, 'CONFIG_COMPLETE')
                    }
                })
            }
        })
    } catch (error) {
        console.log(`- updateProperties - ${error}`)
    }

}


let sendActionProperties = () => {
    try {
        checkHubMode(() => {
            getDevices(get_device, (respData) => {
                console.log('response received getDevices')
                if (respData.type == "get_device_hub") {
                    if (respData.dataArray.length > 0) {
                        let propArr = []
                        console.log('inside get_device_hub response devices found')
                        respData.dataArray.forEach((element, id, arr) => {
                            let propObj = {
                                "device": {
                                    "CML_SERIAL_ID": element.CML_SERIAL_ID,
                                    "MODEL_NUMBER": element.MODEL_NUMBER,
                                    "CML_SUB_TYPE": element.CML_SUB_TYPE,
                                    "CML_MANUFACTURER_NAME": element.CML_MANUFACTURER_NAME
                                }
                            }
                            propArr.push(propObj)
                            if (id == arr.length - 1) {
                                console.log('response received getDevices ' + JSON.stringify(propArr))
                                updateProperties(propArr)
                            }
                        });
                    }
                }
            })
        })
    } catch (error) {
        console.log(`- sendactionProperties - ${error}`)
    }
}

const getProperty = (cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - inside getProperty function`);
        let propertyObj = {
            "data": {
                "requestId": new Date().getTime() + "_getProperty_initScript_" + new Date().getSeconds() * 10,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_getProperty_initScript_' + new Date().getSeconds() * 10,
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            },
            "type": "get_property"
        }
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getProperty - RequestID# ${propertyObj.data.requestId} - ClientID# ${propertyObj.data.clientId}`);
        mqttclient.subscribe(propertyObj.data.clientId)
        Emitter.once(propertyObj.data.requestId, (err, response) => {
            mqttclient.unsubscribe(propertyObj.data.clientId)
            console.log(`${new Date().toJSON()} - initialInstallationScript message - getProperty - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', propertyObj)
    } catch (err) {
        console.log(`- getProperty - ${err}`)
    }
}

const updateProperty = (query, cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - updateProperty - in function updateProperty - `);
        // "updateData": {"CML_TITLE": "My Property", "LAST_MODIFIED_BY_ON_CLOUZER_SOUL": "system.scripts@clouzer.com", "LAST_MODIFIED_ON_ON_CLOUZER_SOUL": 1593591083106 },
        // "queryData": {"PROPERTY_ID": "ID1586944718349196265"},
        let upPropertyObj = {
            "type": "update_property",
            "data": {
                "requestId": new Date().getTime() + "_updateProperty_initScript_" + new Date().getSeconds() * 10,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_updateProperty_initScript_' + new Date().getSeconds() * 10,

                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            }
        }
        Object.assign(upPropertyObj.data, query)
        console.log(`${new Date().toJSON()} - initialInstallationScript message - updateProperty - RequestID# ${upPropertyObj.data.requestId} - ClientID# ${upPropertyObj.data.clientId}`);
        Emitter.once(upPropertyObj.data.requestId, (err, response) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript message - updateProperty - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', upPropertyObj)
    } catch (error) {
        console.log(`- updateProperty - ${error}`)
    }
}

const updateLocation = (query, cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - updateLocation - in function updateLocation - `);
        // "updateData": {"CML_CITY": "Miami","CML_COUNTRY_CODE": "US","CML_COUNTRY": "United States Of America","CML_LATITUDE": "40.7127753","CML_LONGITUDE": "-74.0059728","CML_TIMEZONE": "America/New_York","ADRESS_LINE2": "Pompano Beach","CML_LOCATION": "","CML_ZIPCODE": "10007","CML_CONTINENT": "North America","CML_STATE": "FL"}
        // "queryData": {"LOCATION_ID": "ID1586944718160150269"}
        let upDateLocationObj = {
            "type": "update_location",
            "data": {
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                },
                "requestId": new Date().getTime() + "_upDateLocationObj_initScript_" + new Date().getSeconds() * 10,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_upDateLocationObj_initScript_' + new Date().getSeconds() * 10,
            }
        }
        Object.assign(upDateLocationObj.data, query)
        console.log(`${new Date().toJSON()} - initialInstallationScript message - updateLocation - RequestID# ${upDateLocationObj.data.requestId} - ClientID# ${upDateLocationObj.data.clientId}`);
        Emitter.once(upDateLocationObj.data.requestId, (err, response) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript message - updateLocation - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', upDateLocationObj)
    } catch (err) {
        console.log(`- updateLocation - ${err}`)
    }
}

const getFloor = (cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getFloor - in function getFloor - `);
        let getFloorObj = {
            "data": {
                "requestId": new Date().getTime() + "_getFloor_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_getFloor_initScript_' + new Date().getSeconds() * 10,
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            },
            "type": "get_floor"
        }
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getFloor - RequestID# ${getFloorObj.data.requestId} - ClientID# ${getFloorObj.data.clientId}`);
        mqttclient.subscribe(getFloorObj.data.clientId)
        Emitter.once(getFloorObj.data.requestId, (err, response) => {
            mqttclient.unsubscribe(getFloorObj.data.clientId)
            console.log(`${new Date().toJSON()} - initialInstallationScript message - getFloor - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', getFloorObj)
    } catch (err) {
        console.log(`- getFloor - ${err}`)
    }
}

const getRoom = (query, cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getRoom - in function getRoom - `);
        let getRoomObj = {
            "data": {
                "requestId": new Date().getTime() + "_getRoom_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_getRoom_initScript_' + new Date().getSeconds() * 10,
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            },
            "type": "get_room"
        }
        Object.assign(getRoomObj.data, query)
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getRoom - RequestID# ${getRoomObj.data.requestId} - ClientID# ${getRoomObj.data.clientId}`);
        mqttclient.subscribe(getRoomObj.data.clientId)
        Emitter.once(getRoomObj.data.requestId, (err, response) => {
            mqttclient.unsubscribe(getRoomObj.data.clientId)
            console.log(`${new Date().toJSON()} - initialInstallationScript message - getRoom - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', getRoomObj)
    } catch (err) {
        console.log(`- getRoom - ${err}`)
    }
}

const getDevice = (query, cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getDevice - in function getDevice - `)
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getDevice - query# ${query} - `)
        let getDeviceObj = {
            "data": {
                "requestId": new Date().getTime() + "_getDevice_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_getDevice_initScript_' + new Date().getSeconds() * 10,
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            },
            "type": "get_device"
        }
        Object.assign(getDeviceObj.data, query)
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getDevice - RequestID# ${getDeviceObj.data.requestId} - ClientID# ${getDeviceObj.data.clientId}`);
        mqttclient.subscribe(getDeviceObj.data.clientId)
        Emitter.once(getDeviceObj.data.requestId, (err, response) => {
            mqttclient.unsubscribe(getDeviceObj.data.clientId)
            console.log(`${new Date().toJSON()} - initialInstallationScript message - getDevice - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', getDeviceObj)
    } catch (err) {
        console.log(`- getDevice - ${err}`)
    }
}

const addFloor = (query, cb) => {
    try {
        /*
        {
                        "TARGET": "/ID1586944718349196265",
                        "ACTIVE_STATUS": 1,
                        "PROPERTY_ID": "ID1586944718349196265",
                        "FLOOR_ID": "ID158995722791417247",
                        "CML_TYPE": "floor",
                        "CML_SUB_TYPE": "",
                        "CML_TITLE": "floor2",
                        "KEY_VAL": "NA",
                        "CML_PARENT_ID": "NA",
                        "CML_REF_ID": "NA",
                        "SYNC_PENDING_STATUS": 0,
                        "KEY_TYPE": "SEC",
                        "SUB_KEY_TYPE": "SEC_FLR",
                        "ROOM_ID": "0",
                        "CREATED_BY_ON_CLOUZER_SOUL": "tech.support@clouzer.com",
                        "CREATED_ON_ON_CLOUZER_SOUL": 1589937426551,
                        "LAST_MODIFIED_BY_ON_CLOUZER_SOUL": "tech.support@clouzer.com",
                        "LAST_MODIFIED_ON_ON_CLOUZER_SOUL": 1589937426554,
                        "entity_type": "structure"
                    }
        */
        console.log(`${new Date().toJSON()} - initialInstallationScript message - addFloor - in function addFloor - `);
        console.log(`${new Date().toJSON()} - initialInstallationScript message - addFloor - query# ${query} - `);
        let addFloorObj = {
            "type": "add_floor",
            "data": {
                "requestId": new Date().getTime() + "_addFloor_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_addFloor_initScript_' + new Date().getSeconds() * 10,
                "dataArray": [],
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            }
        }
        addFloorObj.data.dataArray.push(query)
        console.log(`${new Date().toJSON()} - initialInstallationScript message - addFloor - RequestID# ${addFloorObj.data.requestId} - ClientID# ${addFloorObj.data.clientId}`);
        Emitter.once(addFloorObj.data.requestId, (err, response) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript message - addFloor - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', addFloorObj)
    } catch (err) {
        console.log(`- addFloor - ${err}`)
    }
}

const addRoom = (query, cb) => {
    try {
        /*
        {
                        "TARGET": "/ID1574068814087162255/ID1590053367117114289",
                        "CML_TYPE": "room",
                        "CML_SUB_TYPE": "bedroom",
                        "CML_TITLE": "my_Room1590062700325",
                        "KEY_TYPE": "SEC",
                        "SUB_KEY_TYPE": "SEC_ROM",
                        "CREATED_BY_ON_CLOUZER_SOUL": "alex.ward@clouzer.com",
                        "CREATED_ON_ON_CLOUZER_SOUL": 1590062700325,
                        "LAST_MODIFIED_BY_ON_CLOUZER_SOUL": "alex.ward@clouzer.com",
                        "LAST_MODIFIED_ON_ON_CLOUZER_SOUL": 1590062700325,
                        "ACTIVE_STATUS": 1,
                        "entity_type": "structure",
                        "PROPERTY_ID": "ID1574068814087162255",
                        "FLOOR_ID": "ID1590053367117114289"
                    }
        */
        console.log(`${new Date().toJSON()} - initialInstallationScript message - addRoom - in function addRoom - `);
        console.log(`${new Date().toJSON()} - initialInstallationScript message - addRoom - query# ${query} - `);
        let addRoomObj = {
            "type": "add_room",
            "data": {
                "requestId": new Date().getTime() + "_addRoom_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_addRoom_initScript_' + new Date().getSeconds() * 10,
                "dataArray": [],
                "userId": "tech.support@clouzer.com",
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            }
        }
        addRoomObj.data.dataArray.push(query)
        console.log(`${new Date().toJSON()} - initialInstallationScript message - addRoom - RequestID# ${addRoomObj.data.requestId} - ClientID# ${addRoomObj.data.clientId}`);
        Emitter.once(addRoomObj.data.requestId, (err, response) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript message - addRoom - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', addRoomObj)
    } catch (err) {
        console.log(`- addRoom - ${err}`)
    }
}

const addDevice = (query, cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - addDevice - in function addDevice - `);
        console.log(`${new Date().toJSON()} - initialInstallationScript message - addDevice - query# ${query} - `);
        query.requestId = new Date().getTime() + "_addDevice_initScript_" + new Date().getSeconds() * 100
        query.userId = 'admin@clouzer.com'
        console.log(`${new Date().toJSON()} - initialInstallationScript message - addDevice - RequestID# ${query.requestId} - `);
        Emitter.once(query.requestId, (err, response) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript message - addRoom - response received`);
            cb(err, response)
        })
        mqttWrite('discovery_response', query)

    } catch (err) {
        console.log(`- addDevice - ${err}`)
    }
}

const updateDevice = (query, cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - updateDevice - in function updateDevice - `);
        console.log(`${new Date().toJSON()} - initialInstallationScript message - updateDevice - query# ${query} - `);
        /*
        {
                      "queryData": {
                        "DEVICE_ID": "ID1709558499206097598669447"
                      },
                      "updateData": {
                        "TARGET": "/ID1709214961412606739569847/ID1709553836891549704540431/ID1709553848478493166126273",
                        "CML_TITLE": "CHECK171",
                        "STRUCTURE_ID": "ID1709553848478493166126273"
                      }
                    }
        */
        let updateDeviceObj = {
            "data": {
                "requestId": new Date().getTime() + "_updateDevice_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_updateDevice_initScript_' + new Date().getSeconds() * 10,
                "dataArray": [],
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            },
            "type": "update_device"
        }
        // Object.assign(updateDeviceObj.data, query)
        updateDeviceObj.data.dataArray.push(query)
        console.log(`${new Date().toJSON()} - initialInstallationScript message - updateDevice - RequestID# ${updateDeviceObj.data.requestId} - ClientID# ${updateDeviceObj.data.clientId}`);
        Emitter.once(updateDeviceObj.data.requestId, (err, response) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript message - updateDevice - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', updateDeviceObj)
    } catch (err) {
        console.log(`- updateDevice - ${err}`)
    }
}

const changeMode = (mode, cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - changeMode - in function changeMode - `);
        console.log(`${new Date().toJSON()} - initialInstallationScript message - changeMode - Mode# ${mode} - `);
        let changeMode = {
            "type": "change_mode",
            "data": {
                "systemData": [
                    {
                        "hubMode": mode
                    }
                ],
                "requestId": new Date().getTime() + "_changeMode_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_changeMode_initScript_' + new Date().getSeconds() * 10,
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            }
        }
        let flag = 1
        console.log(`${new Date().toJSON()} - initialInstallationScript message - changeMode - RequestID# ${changeMode.data.requestId} - ClientID# ${changeMode.data.clientId}`);
        mqttclient.subscribe('hubActionResponse/controller')
        Emitter.on(changeMode.data.requestId, (err, response) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript message - changeMode - response received`);
            if (flag == 1 && response && response.hasOwnProperty('dataArray') && response.dataArray.length > 0 && response.dataArray[0].entity_type == 'database' && response.dataArray[0].CML_HUB_MODE == mode) {
                flag++
                console.log(`${new Date().toJSON()} - initialInstallationScript message - changeMode - response received - requested mode# ${mode} && recieved mode# ${response.dataArray[0].CML_HUB_MODE} - `);
                mqttclient.unsubscribe('hubActionResponse/controller')
                Emitter.removeListener(changeMode.data.requestId, () => {})
                cb(err, response)
            }
        })
        mqttWrite('hubAction/installer', changeMode)
    } catch (err) {
        console.log(`- changeMode - ${err}`)
    }
}

const sendStructure = (cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - sendStructure - in function sendStructure - `);
        let sendStructObj = {
            type: 'send_structure',
            data: {
                CallerInfo: {
                    source: ['iOS_ClouzerEdge'],
                    caller: 'syncToClz'
                },
                "requestId": new Date().getTime() + "_sendStructure_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_sendStructure_initScript_' + new Date().getSeconds() * 10,
            },
        }
        console.log(`${new Date().toJSON()} - initialInstallationScript message - sendStructure - RequestID# ${sendStructObj.data.requestId} - ClientID# ${sendStructObj.data.clientId}`);

        mqttclient.subscribe('hubActionResponse/controller')
        Emitter.once('SYNC_RESPONSE', (err, resp) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript message - response recieved - `);
            mqttclient.unsubscribe('hubActionResponse/controller')
            if (resp.type == "bulk_update_error") {
                console.log(`${new Date().toJSON()} - initialInstallationScript message - response recieved - sendStructure - please register hub  - `);
                cb(false)
            } else if (resp.type == 'clz_sync_acknowledgement_hub') {
                console.log(`${new Date().toJSON()} - initialInstallationScript message - sendStructure - response recieved -  - `);
                cb(true)
            }
        })

        setTimeout(() => {
            mqttWrite('hubAction/controller', sendStructObj)
        }, 10000)

    } catch (err) {
        console.log(`- sendStructure - ${err}`)  
     }
}

const getMode = (cb) => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getMode - in function getMode - `);
        let getModeObj = {
            "data": {
                "requestId": new Date().getTime() + "_changeMode_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_changeMode_initScript_' + new Date().getSeconds() * 10,
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            },
            "type": "get_mode"
        }
        console.log(`${new Date().toJSON()} - initialInstallationScript message - getMode - RequestID# ${getModeObj.data.requestId} - ClientID# ${getModeObj.data.clientId}`);
        mqttclient.subscribe(getModeObj.data.clientId)
        Emitter.once(getModeObj.data.requestId, (err, response) => {
            mqttclient.unsubscribe(getModeObj.data.clientId)
            console.log(`${new Date().toJSON()} - initialInstallationScript message - getMode - response received`);
            // {"type":"get_mode_hub","dataArray":[{"hubMode":"07"}],"requestId":"/sync#AC:DB:DA:4B:F0:48#1709045703333r185r223","CallerInfo":{"source":["installerPortal"],"caller":"onclick_event","portalAction":true,"tsEntry":1709045703446},"userId":"AC:DB:DA:4B:F0:48","clientId":"portal1709045702542r128"}
            cb(err, response)
        })
        mqttWrite('hubAction/installer', getModeObj)
    } catch (err) {
        console.log(`- getMode - ${err}`)
    }
}

let createFloorObj = (propertyData) => {
    return {
        "TARGET": propertyData.dataArray[0].TARGET,
        "ACTIVE_STATUS": 1,
        "PROPERTY_ID": propertyData.dataArray[0].PROPERTY_ID,
        "FLOOR_ID": "",
        "CML_TYPE": "floor",
        "CML_SUB_TYPE": "",
        "CML_TITLE": "SENSOR DEFAUL FLOOR_" + new Date().getDay(),
        "KEY_VAL": "NA",
        "CML_PARENT_ID": "NA",
        "CML_REF_ID": "NA",
        "SYNC_PENDING_STATUS": 0,
        "KEY_TYPE": "SEC",
        "SUB_KEY_TYPE": "SEC_FLR",
        "ROOM_ID": "0",
        "CREATED_BY_ON_CLOUZER_SOUL": "admin@clouzer.com",
        "CREATED_ON_ON_CLOUZER_SOUL": new Date().getTime(),
        "LAST_MODIFIED_BY_ON_CLOUZER_SOUL": "admin@clouzer.com",
        "LAST_MODIFIED_ON_ON_CLOUZER_SOUL": new Date().getTime(),
        "entity_type": "structure"
    }
}

let createRoomObj = (floorData) => {
    return {
        "TARGET": floorData.dataArray[0].TARGET,
        "CML_TYPE": "room",
        "CML_SUB_TYPE": "bedroom",
        "CML_TITLE": "SENSOR_DEFAULT_ROOM",
        "KEY_TYPE": "SEC",
        "SUB_KEY_TYPE": "SEC_ROM",
        "CREATED_BY_ON_CLOUZER_SOUL": "admin@clouzer.com",
        "CREATED_ON_ON_CLOUZER_SOUL": new Date().getTime(),
        "LAST_MODIFIED_BY_ON_CLOUZER_SOUL": "admin@clouzer.com",
        "LAST_MODIFIED_ON_ON_CLOUZER_SOUL": new Date().getTime(),
        "ACTIVE_STATUS": 1,
        "entity_type": "structure",
        "PROPERTY_ID": floorData.dataArray[0].PROPERTY_ID,
        "FLOOR_ID": floorData.dataArray[0].FLOOR_ID
    }
}

let updateDeviceObj = (roomData, deviceData) => {
    return {
        "updateData": {
            "STRUCTURE_ID": roomData.dataArray[0].STRUCTURE_ID,
            "TARGET": roomData.dataArray[0].TARGET
        },
        "queryData": {
            "DEVICE_ID": [
                deviceData.dataArray[0].DEVICE_ID
            ]
        }
    }
}
const deleteRoom = (query, cb) => {
    try {
        // "queryData": {
        //     "STRUCTURE_ID": "ID1589966833781164274"
        // },
        console.log(`${new Date().toJSON()} - initialInstallationScript message - deleteRoom - in function deleteRoom - `);
        let deleteRoomObj = {
            "data": {
                "requestId": new Date().getTime() + "_deleteRoom_initScript_" + new Date().getSeconds() * 100,
                "userId": "admin@clouzer.com",
                "clientId": "v2admin_" + new Date().getTime() + '_deleteRoom_initScript_' + new Date().getSeconds() * 10,
                "CallerInfo": {
                    "source": [
                        "UI"
                    ],
                    "caller": "onclick_event"
                }
            },
            "type": "delete_room"
        }
        Object.assign(deleteRoomObj.data, query)
        console.log(`${new Date().toJSON()} - initialInstallationScript message - deleteRoom - RequestID# ${deleteRoomObj.data.requestId} - ClientID# ${deleteRoomObj.data.clientId}`);
        Emitter.once(deleteRoomObj.data.requestId, (err, response) => {
            console.log(`${new Date().toJSON()} - initialInstallationScript message - deleteRoom - response received`);
            cb(err, response)
        })
        mqttWrite('hubAction/installer', deleteRoomObj)
    } catch (err) {
        console.log(`- deleteRoom - ${err}`)
    }
}
const startConfigFlow = () => {
    try {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - startConfigFlow - in function startConfigFlow - `);
        getProperty((propertyErr, propertyData) => {
            if (propertyData && propertyData.hasOwnProperty("dataArray") && propertyData.dataArray.length > 0 && propertyData.dataArray[0].KEY_VAL == '') {
                getMode((modeErr, modeData) => {
                    if (modeData && modeData.hasOwnProperty('dataArray') && modeData.dataArray.length > 0 && modeData.dataArray[0].hasOwnProperty("hubMode") && modeData.dataArray[0].hubMode == "04") {
                        updateProperty({ "updateData": { "CML_TITLE": "TestProperty_forSensor", "LAST_MODIFIED_BY_ON_CLOUZER_SOUL": "admin@clouzer.com", "LAST_MODIFIED_ON_ON_CLOUZER_SOUL": new Date().getTime() } }, (err, upPropRes) => {
                            if (upPropRes && upPropRes.hasOwnProperty('dataArray') && upPropRes.dataArray.length > 0) {
                                updateLocation({ "updateData": { "CML_CITY": "Miami", "CML_COUNTRY_CODE": "US", "CML_COUNTRY": "United States Of America", "CML_LATITUDE": "40.7127753", "CML_LONGITUDE": "-74.0059728", "CML_TIMEZONE": "America/New_York", "ADDRESS_LINE2": "Pompano Beach", "CML_LOCATION": "", "CML_ZIPCODE": "10007", "CML_CONTINENT": "North America", "CML_STATE": "FL" } }, (locErr, upLocation) => {
                                    if (upLocation && upLocation.hasOwnProperty('dataArray') && upLocation.dataArray.length > 0) {
                                        getRoom({ "queryData": { "CML_TITLE": "SENSOR_DEFAULT_ROOM" } }, (getRerr, getRdata) => {
                                            if (getRdata && getRdata.hasOwnProperty('dataArray') && getRdata.dataArray.length > 0) {
                                                deleteRoom({ "queryData": { "STRUCTURE_ID": getRdata.dataArray[0].STRUCTURE_ID } }, (drErr, drRes) => {
                                                    if (drRes && drRes.hasOwnProperty('dataArray') && drRes.dataArray.length > 0) {
                                                        getFloor((getFloorErr, getFloorData) => {
                                                            if (getFloorData && getFloorData.hasOwnProperty('dataArray') && getFloorData.dataArray.length > 0) {
                                                                let re_floor = getFloorData.dataArray.find((fEle) => fEle.STRUCTURE_ID != -2)
                                                                let prepareRoom = { 'dataArray': [] }
                                                                prepareRoom.dataArray.push(re_floor)
                                                                let roomQuery = createRoomObj(prepareRoom)
                                                                addRoom(roomQuery, (rErr, rData) => {
                                                                    if (rData && rData.hasOwnProperty('dataArray') && rData.dataArray.length > 0) {
                                                                        // '122398#awair-element#70886B1A839A'
                                                                        getDevice({ "queryData": { 'CML_SERIAL_ID': deviceObj.data[0].controller.id } }, (gdErr, gdArr) => {
                                                                            if (gdArr && gdArr.hasOwnProperty('dataArray') && gdArr.dataArray.length > 0) {
                                                                                let updateDeviceQuery = updateDeviceObj(rData, gdArr)
                                                                                updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                    if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                        changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                            sendStructure((flag) => { });
                                                                                        })
                                                                                    }
                                                                                })
                                                                            } else {
                                                                                addDevice(deviceObj, (addDeviceErr, addDeviceData) => {
                                                                                    let updateDeviceQuery = updateDeviceObj(rData, addDeviceData)
                                                                                    updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                        if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                            changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                sendStructure((flag) => { });
                                                                                            })
                                                                                        }
                                                                                    })
                                                                                })
                                                                            }
                                                                        })
                                                                    }
                                                                })
                                                            } else {
                                                                let floorQuery = createFloorObj(propertyData)
                                                                addFloor(floorQuery, (addFloorErr, addFloorData) => {
                                                                    if (addFloorData && addFloorData.hasOwnProperty('dataArray') && addFloorData.dataArray.length > 0) {
                                                                        let roomQuery = createRoomObj(addFloorData)
                                                                        addRoom(roomQuery, (addRoomErr, addRoomData) => {
                                                                            getDevice({ "queryData": { 'CML_SERIAL_ID': deviceObj.data[0].controller.id } }, (gdErr, gdArr) => {
                                                                                if (gdArr && gdArr.hasOwnProperty('dataArray') && gdArr.dataArray.length > 0) {
                                                                                    let updateDeviceQuery = updateDeviceObj(addRoomData, gdArr)
                                                                                    updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                        if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                            changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                sendStructure((flag) => { });
                                                                                            })
                                                                                        }
                                                                                    })
                                                                                } else {
                                                                                    addDevice(deviceObj, (addDeviceErr, addDeviceData) => {
                                                                                        let updateDeviceQuery = updateDeviceObj(addRoomData, addDeviceData)
                                                                                        updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                            if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                                changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                    sendStructure((flag) => { });
                                                                                                })
                                                                                            }
                                                                                        })
                                                                                    })
                                                                                }
                                                                            })
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    }
                                                })
                                            } else {
                                                getFloor((getFloorErr, getFloorData) => {
                                                    if (getFloorData && getFloorData.hasOwnProperty('dataArray') && getFloorData.dataArray.length > 0) {
                                                        let re_floor = getFloorData.dataArray.find((fEle) => fEle.STRUCTURE_ID != -2)
                                                        let prepareRoom = { 'dataArray': [] }
                                                        prepareRoom.dataArray.push(re_floor)
                                                        let roomQuery = createRoomObj(prepareRoom)
                                                        addRoom(roomQuery, (rErr, rData) => {
                                                            if (rData && rData.hasOwnProperty('dataArray') && rData.dataArray.length > 0) {
                                                                // '122398#awair-element#70886B1A839A'
                                                                getDevice({ "queryData": { 'CML_SERIAL_ID': deviceObj.data[0].controller.id } }, (gdErr, gdArr) => {
                                                                    if (gdArr && gdArr.hasOwnProperty('dataArray') && gdArr.dataArray.length > 0) {
                                                                        let updateDeviceQuery = updateDeviceObj(rData, gdArr)
                                                                        updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                            if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                    sendStructure((flag) => { });
                                                                                })
                                                                            }
                                                                        })
                                                                    } else {
                                                                        addDevice(deviceObj, (addDeviceErr, addDeviceData) => {
                                                                            let updateDeviceQuery = updateDeviceObj(rData, addDeviceData)
                                                                            updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                    changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                        sendStructure((flag) => { });
                                                                                    })
                                                                                }
                                                                            })
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    } else {
                                                        let floorQuery = createFloorObj(propertyData)
                                                        addFloor(floorQuery, (addFloorErr, addFloorData) => {
                                                            if (addFloorData && addFloorData.hasOwnProperty('dataArray') && addFloorData.dataArray.length > 0) {
                                                                let roomQuery = createRoomObj(addFloorData)
                                                                addRoom(roomQuery, (addRoomErr, addRoomData) => {
                                                                    getDevice({ "queryData": { 'CML_SERIAL_ID': deviceObj.data[0].controller.id } }, (gdErr, gdArr) => {
                                                                        if (gdArr && gdArr.hasOwnProperty('dataArray') && gdArr.dataArray.length > 0) {
                                                                            let updateDeviceQuery = updateDeviceObj(addRoomData, gdArr)
                                                                            updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                    changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                        sendStructure((flag) => { });
                                                                                    })
                                                                                }
                                                                            })
                                                                        } else {
                                                                            addDevice(deviceObj, (addDeviceErr, addDeviceData) => {
                                                                                let updateDeviceQuery = updateDeviceObj(addRoomData, addDeviceData)
                                                                                updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                    if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                        changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                            sendStructure((flag) => { });
                                                                                        })
                                                                                    }
                                                                                })
                                                                            })
                                                                        }
                                                                    })
                                                                })
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
                    } else {
                        changeMode('CONFIG_START', (changeModeErr, changeModeData) => {
                            if (changeModeData.dataArray[0].CML_HUB_MODE == 'CONFIG_START') {
                                updateProperty({ "updateData": { "CML_TITLE": "TestProperty_forSensor", "LAST_MODIFIED_BY_ON_CLOUZER_SOUL": "admin@clouzer.com", "LAST_MODIFIED_ON_ON_CLOUZER_SOUL": new Date().getTime() } }, (err, upPropRes) => {
                                    if (upPropRes && upPropRes.hasOwnProperty('dataArray') && upPropRes.dataArray.length > 0) {
                                        updateLocation({ "updateData": { "CML_CITY": "Miami", "CML_COUNTRY_CODE": "US", "CML_COUNTRY": "United States Of America", "CML_LATITUDE": "40.7127753", "CML_LONGITUDE": "-74.0059728", "CML_TIMEZONE": "America/New_York", "ADDRESS_LINE2": "Pompano Beach", "CML_LOCATION": "", "CML_ZIPCODE": "10007", "CML_CONTINENT": "North America", "CML_STATE": "FL" } }, (locErr, upLocation) => {
                                            if (upLocation && upLocation.hasOwnProperty('dataArray') && upLocation.dataArray.length > 0) {
                                                getRoom({ "queryData": { "CML_TITLE": "SENSOR_DEFAULT_ROOM" } }, (getRerr, getRdata) => {
                                                    if (getRdata && getRdata.hasOwnProperty('dataArray') && getRdata.dataArray.length > 0) {
                                                        deleteRoom({ "queryData": { "STRUCTURE_ID": getRdata.dataArray[0].STRUCTURE_ID } }, (drErr, drRes) => {
                                                            if (drRes && drRes.hasOwnProperty('dataArray') && drRes.dataArray.length > 0) {
                                                                getFloor((getFloorErr, getFloorData) => {
                                                                    if (getFloorData && getFloorData.hasOwnProperty('dataArray') && getFloorData.dataArray.length > 0) {
                                                                        let re_floor = getFloorData.dataArray.find((fEle) => fEle.STRUCTURE_ID != -2)
                                                                        let prepareRoom = { 'dataArray': [] }
                                                                        prepareRoom.dataArray.push(re_floor)
                                                                        let roomQuery = createRoomObj(prepareRoom)
                                                                        addRoom(roomQuery, (rErr, rData) => {
                                                                            if (rData && rData.hasOwnProperty('dataArray') && rData.dataArray.length > 0) {
                                                                                // '122398#awair-element#70886B1A839A'
                                                                                getDevice({ "queryData": { 'CML_SERIAL_ID': deviceObj.data[0].controller.id } }, (gdErr, gdArr) => {
                                                                                    if (gdArr && gdArr.hasOwnProperty('dataArray') && gdArr.dataArray.length > 0) {
                                                                                        let updateDeviceQuery = updateDeviceObj(rData, gdArr)
                                                                                        updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                            if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                                changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                    sendStructure((flag) => { });
                                                                                                })
                                                                                            }
                                                                                        })
                                                                                    } else {
                                                                                        addDevice(deviceObj, (addDeviceErr, addDeviceData) => {
                                                                                            let updateDeviceQuery = updateDeviceObj(rData, addDeviceData)
                                                                                            updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                                if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                                    changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                        sendStructure((flag) => { });
                                                                                                    })
                                                                                                }
                                                                                            })
                                                                                        })
                                                                                    }
                                                                                })
                                                                            }
                                                                        })
                                                                    } else {
                                                                        let floorQuery = createFloorObj(propertyData)
                                                                        addFloor(floorQuery, (addFloorErr, addFloorData) => {
                                                                            if (addFloorData && addFloorData.hasOwnProperty('dataArray') && addFloorData.dataArray.length > 0) {
                                                                                let roomQuery = createRoomObj(addFloorData)
                                                                                addRoom(roomQuery, (addRoomErr, addRoomData) => {
                                                                                    getDevice({ "queryData": { 'CML_SERIAL_ID': deviceObj.data[0].controller.id } }, (gdErr, gdArr) => {
                                                                                        if (gdArr && gdArr.hasOwnProperty('dataArray') && gdArr.dataArray.length > 0) {
                                                                                            let updateDeviceQuery = updateDeviceObj(addRoomData, gdArr)
                                                                                            updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                                if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                                    changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                        sendStructure((flag) => { });
                                                                                                    })
                                                                                                }
                                                                                            })
                                                                                        } else {
                                                                                            addDevice(deviceObj, (addDeviceErr, addDeviceData) => {
                                                                                                let updateDeviceQuery = updateDeviceObj(addRoomData, addDeviceData)
                                                                                                updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                                    if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                                        changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                            sendStructure((flag) => { });
                                                                                                        })
                                                                                                    }
                                                                                                })
                                                                                            })
                                                                                        }
                                                                                    })
                                                                                })
                                                                            }
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    } else {
                                                        getFloor((getFloorErr, getFloorData) => {
                                                            if (getFloorData && getFloorData.hasOwnProperty('dataArray') && getFloorData.dataArray.length > 0) {
                                                                let re_floor = getFloorData.dataArray.find((fEle) => fEle.STRUCTURE_ID != -2)
                                                                let prepareRoom = { 'dataArray': [] }
                                                                prepareRoom.dataArray.push(re_floor)
                                                                let roomQuery = createRoomObj(prepareRoom)
                                                                addRoom(roomQuery, (rErr, rData) => {
                                                                    if (rData && rData.hasOwnProperty('dataArray') && rData.dataArray.length > 0) {
                                                                        // '122398#awair-element#70886B1A839A'
                                                                        getDevice({ "queryData": { 'CML_SERIAL_ID': deviceObj.data[0].controller.id } }, (gdErr, gdArr) => {
                                                                            if (gdArr && gdArr.hasOwnProperty('dataArray') && gdArr.dataArray.length > 0) {
                                                                                let updateDeviceQuery = updateDeviceObj(rData, gdArr)
                                                                                updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                    if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                        changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                            sendStructure((flag) => { });
                                                                                        })
                                                                                    }
                                                                                })
                                                                            } else {
                                                                                addDevice(deviceObj, (addDeviceErr, addDeviceData) => {
                                                                                    let updateDeviceQuery = updateDeviceObj(rData, addDeviceData)
                                                                                    updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                        if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                            changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                sendStructure((flag) => { });
                                                                                            })
                                                                                        }
                                                                                    })
                                                                                })
                                                                            }
                                                                        })
                                                                    }
                                                                })
                                                            } else {
                                                                let floorQuery = createFloorObj(propertyData)
                                                                addFloor(floorQuery, (addFloorErr, addFloorData) => {
                                                                    if (addFloorData && addFloorData.hasOwnProperty('dataArray') && addFloorData.dataArray.length > 0) {
                                                                        let roomQuery = createRoomObj(addFloorData)
                                                                        addRoom(roomQuery, (addRoomErr, addRoomData) => {
                                                                            getDevice({ "queryData": { 'CML_SERIAL_ID': deviceObj.data[0].controller.id } }, (gdErr, gdArr) => {
                                                                                if (gdArr && gdArr.hasOwnProperty('dataArray') && gdArr.dataArray.length > 0) {
                                                                                    let updateDeviceQuery = updateDeviceObj(addRoomData, gdArr)
                                                                                    updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                        if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                            changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                sendStructure((flag) => { });
                                                                                            })
                                                                                        }
                                                                                    })
                                                                                } else {
                                                                                    addDevice(deviceObj, (addDeviceErr, addDeviceData) => {
                                                                                        let updateDeviceQuery = updateDeviceObj(addRoomData, addDeviceData)
                                                                                        updateDevice(updateDeviceQuery, (updateDeviceErr, updateDeviceData) => {
                                                                                            if (updateDeviceData && updateDeviceData.hasOwnProperty('dataArray') && updateDeviceData.dataArray.length > 0) {
                                                                                                changeMode('CONFIG_COMPLETE', (configErr, configData) => {
                                                                                                    sendStructure((flag) => { });
                                                                                                })
                                                                                            }
                                                                                        })
                                                                                    })
                                                                                }
                                                                            })
                                                                        })
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
                            }
                        })
                    }
                })
            } else {
                console.log(`${new Date().toJSON()} - initialInstallationScript message - startConfigFlow - in function startConfigFlow - property is already synced  - `);
                mqttWrite('soulHub/subscribeSensorTopics', {"subscribeTopics": true})
            }
        })
    } catch (err) {
        console.log(`- startConfigFlow - ${err}`)
    }
}

if (mqttclient) {
    console.log(`${new Date().toJSON()} <---Mqtt client is present --> `);
    mqttclient.on('message', (topic, message1) => {
        console.log(`${new Date().toJSON()} - initialInstallationScript message - ${message1.toString()} on topic ${topic}`);
        let message = JSON.parse(message1.toString());
        if (typeof message == "string") {
            message = JSON.parse(message)
        }
        console.log(`${new Date().toJSON()} <---Message --> : ${message}`);
        switch (topic) {
            case 'hubActionResponse/installer':
                if (message.type == "auto_provision_device_hub") {
                    Emitter.emit(message.type, message.error ? message.error : false, message1);
                } else if (message.type == "add_scene_hub") {
                    Emitter.emit(message.type, message.error ? message.error : false, message1);
                } else if (message.type == "delete_scene_hub") {
                    Emitter.emit(message.type, message.error ? message.error : false, message);
                } else if (message.type == "update_button_hub") {
                    Emitter.emit(message.requestId, message.error ? message.error : false, message1);
                } else if (message.type == "add_device_memebers_hub") {
                    Emitter.emit(message.requestId, message.error ? message.error : false, message1);
                }else if(message.type == "change_mode_hub"){
                    Emitter.emit(message.requestId, message.error ? message.error : false, message);
                }
                else {
                    console.log(` initialInstallationScript - mqttHandler - message - ${topic} -  -  -  -  - `);
                    Emitter.emit(message.requestId, message.error ? message.error : false, message);
                }
                break;
            // case 'v2admin':
            //     if (message.type == "get_scene_hub") {
            //         Emitter.emit(message.requestId, message.error ? message.error : false, message1);
            //     }
            //     break;
            case 'soulDb/dbResponse/systemdbresponse':
            case 'systemAction/responseAction':
                Emitter.emit(message.communicationId, message.error, message.data);
                break;
            case 'systemAction/driverStatus':
                Emitter.emit(message.communicationId, message);
                break;
            case 'process/status/soulSystem':
                if (message && message.hasOwnProperty("action") && message.action == "init" && initsetup == 0) {
                    initsetup = 1;
                    insertuserRole(() => {
                        console.log(`${new Date().toJSON()} - initialInstallationScript - mqttHandler - users and roles added successfully`)
                        insertInterface(() => {
                            console.log(`${new Date().toJSON()} - initialInstallationScript - mqttHandler - interfaces added successfully`)
                            folderOperations(() => {
                                console.log(`${new Date().toJSON()} - initialInstallationScript - mqttHandler - scenes added successfully`)
                                console.log(`${new Date().toJSON()} - initialInstallationScript - mqttHandler - hub deployment type is ${getDeploymentType()}`)
                                if (getDeploymentType() == 'n') {
                                    startConfigFlow()
                                }
                                checkTemplateFolder(() => {
                                    console.log(`${new Date().toJSON()} - initialInstallationScript - mqttHandler - Templates added suscessfully`)
                                })

                            })
                        });
                    });
                    // updateScene(JSON.parse(sceneData))
                }
                break;
            case 'soulDapi/deleteDriver':
                Emitter.emit(message.communicationId, message);
                break;
                case 'hubActionResponse/controller':
                if(message.type == 'change_mode_hub'){
                    Emitter.emit(message.requestId, message.error ? message.error : false, message);
                } else if (message.type == "bulk_update_error" || message.type == "clz_sync_acknowledgement_hub") {
                    Emitter.emit('SYNC_RESPONSE', message.error ? message.error : false, message);
                }
                break;
            default:
                if (topic == client) {
                    if (message.type == "get_scene_hub") {
                        Emitter.emit(message.type, message.error ? message.error : false, message1);
                    }
                }
                Emitter.emit(message.requestId, message.error ? message.error : false, message);
                break;
        }
    })
}

let deviceObj = {
    "manufacturer": "awair",
    "deviceType": "SENSOR",
    "data": [
      {
        "devices": [
          {
            "id": "122398#awair-element#70886B1A839A_246",
            "manufacturer": "awair",
            "setpoint": "75.81",
            "time": "",
            "LAST_SYNC_TIME": "",
            "type": "device",
            "shortNameOfDevice": "dataPoints",
            "deviceType": "SENSOR",
            "controllerid": "122398#awair-element#70886B1A839A",
            "supported_type": "246",
            "interface_id": "",
            "credential_id": ""
          },
          {
            "id": "122398#awair-element#70886B1A839A_248",
            "manufacturer": "awair",
            "setpoint": 47.58,
            "time": "",
            "LAST_SYNC_TIME": "",
            "type": "device",
            "shortNameOfDevice": "dataPoints",
            "deviceType": "SENSOR",
            "controllerid": "122398#awair-element_70886B1A839A",
            "supported_type": "248",
            "interface_id": "",
            "credential_id": ""
          },
          {
            "id": "122398#awair-element#70886B1A839A_181",
            "manufacturer": "awair",
            "setpoint": 1505,
            "time": "",
            "LAST_SYNC_TIME": "",
            "type": "device",
            "shortNameOfDevice": "dataPoints",
            "deviceType": "SENSOR",
            "controllerid": "122398#awair-element_70886B1A839A",
            "supported_type": "181",
            "interface_id": "",
            "credential_id": ""
          },
          {
            "id": "122398#awair-element#70886B1A839A_64",
            "manufacturer": "awair",
            "setpoint": 1331,
            "time": "",
            "LAST_SYNC_TIME": "",
            "type": "device",
            "shortNameOfDevice": "dataPoints",
            "deviceType": "SENSOR",
            "controllerid": "122398#awair-element_70886B1A839A",
            "supported_type": "64",
            "interface_id": "",
            "credential_id": ""
          },
          {
            "id": "122398#awair-element#70886B1A839A_33",
            "manufacturer": "awair",
            "setpoint": 28,
            "time": "",
            "LAST_SYNC_TIME": "",
            "type": "device",
            "shortNameOfDevice": "dataPoints",
            "deviceType": "SENSOR",
            "controllerid": "122398#awair-element#70886B1A839A",
            "supported_type": "33",
            "interface_id": "",
            "credential_id": ""
          }
        ],
        "controller": {
          "id": "122398#awair-element#70886B1A839A",
          "name": "Default AQI Sensor",
          "manufacturer": "awair",
          "type": "controller",
          "interface_id": "",
          "credential_id": "",
          "shortNameOfDevice": "sensor_aq",
          "deviceType": "SENSOR",
          "product_id": "awair-element_122398",
          "model_no": "AWAIR REV3E",
          "actions": {
            "supports_ol_off": 10
          }
        }
      }
    ],
    "requestId": "TS_1708953388779",
    "userId": "AC:DB:DA:4B:F0:82"
  }

