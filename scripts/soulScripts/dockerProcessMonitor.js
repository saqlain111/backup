require('shelljs/global');
const mqtt = require('mqtt');
const schedule = require('node-schedule');
const axios=require('axios')
let subscribeTopic = ['process/#','soulDb/dbResponse/systemdbresponse'];
const MQTT_HOST = process.env.base_ip ? process.env.base_ip : '0.0.0.0';
const MQTT_PORT = process.env.broker_port ? process.env.broker_port : '8886';
let ts = new Date().getTime();
let willPayload = { clientId: 'processMonitor' + ts };
const fs = require('fs');
const os = require('os');
const EventEmitter = require('events');
const crypto = require('crypto')
class MyEmitter extends EventEmitter { }
const myEmitter = new MyEmitter();
let platform = os.platform();
let driverArr = [];
let stopedProcess;
let HOME;
if (platform == "linux") {
    HOME = "/home/linaro";
}
const hubSerial = fs.readFileSync(`${HOME}/db/serial`, { encoding: 'utf8' }).trim();
const server = fs.readFileSync(`${HOME}/db/server`, { encoding: 'utf8' }).trim();
let processMonitorId = 'dockerProcessMonitor_' + hubSerial;
let processMonitorData = {};
let driverStatusObj = {};
let driverRestartFlag = false;
let pass = '@Pr0(e$sM0n!t0R';
let pyrestartFlag = false;
const mqtt_authkey = process.env.mqtt_authkey ? process.env.mqtt_authkey : 'NA';
let mqttclient = mqtt.connect('mqtt://' + MQTT_HOST + ':' + MQTT_PORT, {
    username: 'CEDProcessMonitor',
    password: pass,
    will: {
        topic: 'processMonitorDisconnected',
        payload: JSON.stringify(willPayload)
    },
    clientId: processMonitorId,
    reconnectPeriod: 100000,
});

mqttclient.on('connect', () => {
    driverRestartFlag = false;
    console.log(`${new Date().toJSON()} - processMonitor connected to - ${MQTT_HOST + ':' + MQTT_PORT}`);
    mqttclient.subscribe(subscribeTopic);
    mqttclient.publish('process/status', JSON.stringify({}));
})

schedule.scheduleJob('7Min', '*/7 * * * *', function () {
    console.log(`${new Date().toJSON()} - check all process status --------------------->`, server, " hub serial ", hubSerial);
    stopedProcess = "";
    removeUnwantedHubImages()
    if (processMonitorData && Object.keys(processMonitorData).length > 0) {
        getStoppedProcess(processMonitorData)
        console.log(`${new Date().toJSON()} - stoped process... ${stopedProcess}`)
    }
     else {
        mqttclient.publish('process/status', JSON.stringify({}));
    }
})

schedule.scheduleJob('24Hour', '0 0 * * *', function () {
    console.log(`${new Date().toJSON()} - remove unwanted log files --------------------->`);
    let communicationId = new Date().getTime() + 'removelogs' + crypto.randomBytes(1).toJSON().data[0];
    mqttclient.publish('maintenanceAction/requestAction', JSON.stringify({ data: { authKey: mqtt_authkey, type: "removeLogs",keepDrivers:true }, communicationId: communicationId }));
})

const getStoppedProcess = (processMonitorData) =>{
    try {
        let coreProcess = ['soulHub', 'soulPy','soulSystem', 'souldapi','startStandalone'];
        console.log(`${new Date().toJSON()} - getStoppedProcess - process monitor data ${JSON.stringify(processMonitorData)}`)
        for (let process in processMonitorData) {
            if ((processMonitorData[process].action == 'stop' || processMonitorData[process].action == 'disconnected') && coreProcess.includes(processMonitorData[process].process)) {
                if(stopedProcess != "") {
                    stopedProcess += "," + processMonitorData[process].process;
                }else{
                    stopedProcess = processMonitorData[process].process;
                    console.log('stopedProcess in else ==========>',stopedProcess)
                } 
            }
        }
        if (stopedProcess != "") {
            let downProcessArr = stopedProcess.includes(",") ? stopedProcess.split(',') : [stopedProcess]
            console.log(`${new Date().toJSON()} - send critical warning for ====>> `, downProcessArr, " downProcess==>>  ", stopedProcess)
            mqttclient.publish('systemAction/processStatus', JSON.stringify({ typeArray: downProcessArr }))
            getAccessToken(stopedProcess)
        }
    } catch (error) {
        console.log(`${new Date().toJSON()} - error while getStoppedProcess -  -  -  ${error}`)
    }
}

const isJSON = (str) =>{
    try {
        return (JSON.parse(str) && !!str);
    } catch (e) {
        return false;
    }
}

const removeUnwantedHubImages = () =>{
    try {
        console.log(`${new Date().toJSON()} - remving unwanted images :`);
        let communicationId = new Date().getTime() + 'removeimages' + crypto.randomBytes(1).toJSON().data[0];
        mqttclient.publish('maintenanceAction/requestAction', JSON.stringify({ data: { authKey: mqtt_authkey, type: "removeimages",keepDrivers:true }, communicationId: communicationId }));
    } catch (error) {
        console.log(`${new Date().toJSON()} - error while checking unwanted hub images -  -  -  ${error}`)
    }
}


const getAccessToken = (process) => {
    let existsSystemToken = fs.existsSync(`${HOME}/db/systemToken`, 'utf-8');
    let token;
    if (existsSystemToken) {
        token = fs.readFileSync(`${HOME}/db/systemToken`, 'utf-8').trim();
    }
    console.log(`${new Date().toJSON()} -  diagnosticReqHandler : datafromdb : credentials :`, token);
    if (token) {
        console.log(`${new Date().toJSON()} - getAccessToken - if token  present process is ${process}`)
        sendProcessStatusMail(process, token);
    } else {
        let communicationId = new Date().getTime() + 'getCredentails' + crypto.randomBytes(1).toJSON().data[0];
        mqttclient.publish('soulDb/fetch', JSON.stringify({
            data: {
                entity_type: 'credentials',
            },
            communicationId: communicationId,		
            clientId:"systemdbresponse"+new Date().getTime()
        }))
        myEmitter.on(communicationId, (cred) => {
            console.log(`${new Date().toJSON()} - diagnosticReqHandler : datafromdb : credentials :`);
            if (cred.length > 0 && cred[0].hasOwnProperty('ACCESS_TOKEN')) {
                sendProcessStatusMail(process, cred[0].ACCESS_TOKEN);
            } else {
                console.log(`${new Date().toJSON()} - ACCESS_TOKEN not found`)
            }
        })
    }
}

const sendProcessStatusMail = (downProcess, token) => {   //{action:<Process actions>,ts:1534353363,process:'soulClouzer'}
    let mailRecipient = ['eips2node@nciportal.com'];  //["eips2node@nciportal.com"]
    for (let eachRecipient in mailRecipient) {
        console.log(`${new Date().toJSON()} - sending mail for offline hub =>`, hubSerial, " to=>", mailRecipient[eachRecipient]);
        let obj = {
            email: mailRecipient[eachRecipient],
            subject: "hub process status",
            body: `<br><b>serial id</b> : ` + (hubSerial ? hubSerial : 'NA') + `
            <br><b>Down Process</b> : `+ downProcess + `
             <br><b>time</b> : ` + new Date(),
        };
        let options = {
            method: 'post',
            url: server + '/clzMailer',
            headers: {
                'content-type': 'application/json',
                'Authorization': token,
            },
            data: obj,
            strictSSL: false,
        };
        console.log(`${new Date().toJSON()} - send mail obj : `, options)
        axios(options)
        .then((response) => {
            console.log(`${new Date().toJSON()} - sendProcessStatusMail response statusCode`, response.status);
        })
        .catch((error) => {
            console.log(`${new Date().toJSON()} - sendProcessStatusMail response errrr`, error);
        });
    }
}
const startDriverIfStopped=(topic,message)=>{
    try{
        console.log(`${new Date().toJSON()} - processMonitor - processStatusDriver1`);
        let clrTime = 0;
        processMonitorData[message.process] = message;
        if(message.action == "disconnected" && message.hasOwnProperty("driverName") && message.driverName != ""){  
            driverArr.push(message.process);
            console.log(`${new Date().toJSON()} - processMonitor message - driverArr - ${JSON.stringify(driverArr)}`)  
            driverRestartFlag = true;
            clrTime = setTimeout(function(){
                if(driverRestartFlag){
                    console.log(`${new Date().toJSON()}  message - timeout function called for driver`)
                    exec(`sudo docker rm -f ${message.driverName}`,()=>{
                        exec(`sudo docker run -v db:/home/linaro/db  -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -u="linaro" --name ${message.driverName} --env driverName=${message.driverName} --env base_ip=$(hostname -I | awk '{print $1}') --net=host --env broker_port="8886" --env ApplicationEnv="Docker" --env-file /etc/environment -itd -m 64M --cpuset-cpus="1" --cpu-shares=512 ${message.driverName}`);
                    });
                    console.log(`${new Date().toJSON()} message - ${message.driverName} driver restarted`)
                    console.log(`${new Date().toJSON()} message - ${message.process} driver restarted`)
                }else{
                    console.log(`${new Date().toJSON()} - message - clearing timeoutttttttt ${clrTime}`)
                    clearTimeout(clrTime);
                    clrTime = 0;
                }
              }, 20000);  
        }
        if (message.action == 'connected' && driverRestartFlag) {
            driverArr = [];
            if(clrTime){
                console.log(`${new Date().toJSON()} - clearing timeout`)
                clearTimeout(clrTime);
                clrTime = 0;
            }
             driverRestartFlag = false;
        }
        driverStatusObj[message.driverName] = message;
    }
    catch(error){
        console.log("processStatusDriver1:: error :", error)
    }
}
const processStatusDriver=(topic,message)=>{
    try{
        console.log(`${new Date().toJSON()} - processMonitor - processStatusDriver `);
        message.ts = new Date().getTime();
        if(message.hasOwnProperty("process") && message.process != ""){
            startDriverIfStopped(topic,message)
        }
    }
    catch (error) {
        console.log("processStatusDriver:: error :", error)
    }
}

const Getcpudetails = (message) => {
    try {
        console.log(`${new Date().toJSON()} - dockerProcessmonitor  - inside Getcpudetails function `);
        let idata = { 'cml_time': new Date().getTime() };
        exec(`sudo docker stats --no-stream --format '{"Process":"{{.Name}}", "cpu_usage":"{{.CPUPerc}}", "memory_usage":"{{.MemPerc}}"}'`, (error, stdout, stderr) => {
            if (error) {
                mqttclient.publish("process/status/memoryUsage_res", JSON.stringify({
                    "type": "get_memoryusage_hub",
                    "data": { Error: true, msg: error },
                    "requestId": message.requestId,
                    "userId": message.userId,
                    "communicationId": message.communicationId
                }))
            } else {
                let array;
                let arrcpu = [];
                let arrMEM = [];
                let output = JSON.parse(JSON.stringify(stdout.split('\n')))
                function returnArray(output) {
                    return output
                        .filter(key => key.length > 0)
                        .map(key => JSON.parse(key));
                }
                function processDetails(process, cpuData, memData) {
                    switch (process) {
                        case 'soulhub':
                            idata['soulhub_cpu'] = cpuData;
                            idata['soulhub_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'pyprocess':
                            idata['pyprocess_cpu'] = cpuData;
                            idata['pyprocess_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'soulsystem':
                            idata['soulsystem_cpu'] = cpuData;
                            idata['soulsystem_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'portal':
                            idata['portal_cpu'] = cpuData;
                            idata['portal_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'udpserver':
                            idata['udpserver_cpu'] = cpuData;
                            idata['udpserver_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'souldapi':
                            idata['souldapi_cpu'] = cpuData;
                            idata['souldapi_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'startstandalone':
                            idata['startstandalone_cpu'] = cpuData;
                            idata['startstandalone_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1685106892411_142':
                        case 'driver-1685084002284_966':
                            idata['awair_cpu'] = cpuData;
                            idata['awair_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1642498139411_984':
                        case 'driver-1646109201873_211':
                            idata['sonos_cpu'] = cpuData;
                            idata['sonos_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1640856742895_521':
                        case 'driver-1640844629451_310':
                            idata['lutron_cpu'] = cpuData;
                            idata['lutron_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1655878057780_823':
                        case 'driver-1655878133957_829':
                            idata['airthings_cpu'] = cpuData;
                            idata['airthings_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1655893968402_768':
                        case 'driver-1655798121197_24':
                            idata['crestron_cpu'] = cpuData;
                            idata['crestron_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1640851863676_776':
                        case 'driver-1640842739347_284':
                            idata['ecobee_cpu'] = cpuData;
                            idata['ecobee_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1672395142128_807':
                        case 'driver-1672397942578_242':
                            idata['lifx_cpu'] = cpuData;
                            idata['lifx_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1685020355604_747':
                        case 'driver-1685022442693_50':
                        case 'driver-1640853037421_932':
                            idata['philips_cpu'] = cpuData;
                            idata['philips_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1640863226267_716':
                        case 'driver-1689145418582_805':
                            idata['withings_cpu'] = cpuData;
                            idata['withings_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1666346753240_144':
                        case 'driver-1669904968621_504':
                        case 'driver-1640852150555_242':
                        case 'driver-1640843385729_99':
                            idata['hunter douglas_cpu'] = cpuData;
                            idata['hunter douglas_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1652094883011_179':
                        case 'driver-1640852859282_853':
                            idata['kaiterra_cpu'] = cpuData;
                            idata['kaiterra_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData))
                            arrMEM.push(parseFloat(memData))
                            break;
                        case 'driver-1640852528200_227':
                        case 'driver-1640844039053_54':
                            idata['tp link_cpu'] = cpuData;
                            idata['tp link_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData));
                            arrMEM.push(parseFloat(memData));
                            break;
                        case 'driver-1640850800395_158':
                        case 'driver-1640841998325_355':
                            idata['mirabella_cpu'] = cpuData;
                            idata['mirabella_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData));
                            arrMEM.push(parseFloat(memData));
                            break;
                        case 'driver-1640851466744_935':
                        case 'driver-1644226616301_347':
                            idata['honeywell_cpu'] = cpuData;
                            idata['honeywell_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData));
                            arrMEM.push(parseFloat(memData));
                            break;
                        case 'driver-1640861784160_289':
                        case 'driver-1640850979800_900':
                            idata['venstar_cpu'] = cpuData;
                            idata['venstar_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData));
                            arrMEM.push(parseFloat(memData));
                            break;
                        case 'driver-1640858494511_274':
                        case 'driver-1640843805619_262':
                            idata['ketra_cpu'] = cpuData;
                            idata['ketra_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData));
                            arrMEM.push(parseFloat(memData));
                            break;
                        case 'driver-1640851091928_745':
                        case 'driver-1640843009784_435':
                            idata['tuya_cpu'] = cpuData;
                            idata['tuya_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData));
                            arrMEM.push(parseFloat(memData));
                            break;
                        case 'driver-1640852366126_611':
                            idata['darma_cpu'] = cpuData;
                            idata['darma_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData));
                            arrMEM.push(parseFloat(memData));
                            break;
                        case 'driver-1640859243116_764':
                        case 'driver-1640859363250_822':
                            idata['clouds simulators_cpu'] = cpuData;
                            idata['clouds simulators_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData));
                            arrMEM.push(parseFloat(memData));
                            break;
                        case 'driver-1676982092943_840':
                            idata['wiz_cpu'] = cpuData;
                            idata['wiz_mem'] = memData;
                            arrcpu.push(parseFloat(cpuData));
                            arrMEM.push(parseFloat(memData));
                            break;
                        default:
                            console.log(`${new Date().toJSON()} - dockerProcessmonitor  - default ${process} `);
                            break;
                    }
                }
                array = returnArray(output)
                array.forEach((obj, id, arr) => {
                    let cpuNum = obj['cpu_usage'].slice(0, -1);
                    let memNum = obj['memory_usage'].slice(0, -1);
                    processDetails(obj['Process'], cpuNum, memNum)
                });
                idata['overall_cpu'] = (arrcpu.reduce((a, b) => a + b, 0) / arrcpu.length).toFixed(2);
                idata['overall_mem'] = (arrMEM.reduce((a, b) => a + b, 0) / arrMEM.length).toFixed(2);
                let res = {
                    "data": { Error: false },
                    "type": "get_memoryusage_hub",
                    "dataArray": [idata],
                    "requestId": message.requestId,
                    "userId": message.userId,
                    "communicationId": message.communicationId
                }
                console.log(`${new Date().toJSON()} - dockerProcessmonitor  -  Getcpudetails final response ${JSON.stringify(res)}`);
                mqttclient.publish("process/status/memoryUsage_res", JSON.stringify(res))
                idata = []
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - dockerProcessmonitor - Getcpudetails - Exception occured! ` + error);
    }
}

mqttclient.on('message', (topic, message1) => {
    console.log(`${new Date().toJSON()} - message on topic ${topic}`);
    if(isJSON(message1)){
        let message = JSON.parse(message1.toString());
        switch (topic) {
            case 'soulDb/dbResponse/systemdbresponse':		
                myEmitter.emit(message.communicationId,message.data)
                break;
            case 'process/status/soulHub':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                message.ts = new Date().getTime();
                processMonitorData['soulHub'] = message;
                break;
            case 'process/status/soulSystem':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                message.ts = new Date().getTime();
                processMonitorData['soulSystem'] = message;
                break;
            case 'process/status/soulPy':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                message.ts = new Date().getTime();
                processMonitorData['soulPy'] = message;
                if (message.action == "disconnected") {
                    pyrestartFlag = true;
                }
                else if (message.action == 'init' && pyrestartFlag) {
                    pyrestartFlag = false;
                    exec(`sudo docker rm -f soulhub
                    timeZone = cat /home/linaro/db/timeZone
                    sudo docker run -v db:/home/linaro/db -v localassets:/home/linaro/localassets -v logs:/home/linaro/logs -v node_modules:/home/linaro/node_modules -v sounds:/home/linaro/sounds -u="linaro" --name soulhub -p 3000:3000 --env base_ip=$(sudo ifconfig $(ip route show | awk '/default/ {print $5}') | awk '/inet / {print $2}') --env broker_port="8886" --env TZ=${timeZone} --env ApplicationEnv="Docker"  --env host_ip=$(hostname -I | awk '{print $2}') --env-file /etc/environment -itd -m 256M --memory-swap 512M  --cpuset-cpus="1" --cpu-shares=512 soulhub`, (err) => {
                        if(err)
                            console.log(`${new Date().toJSON()} - error while starting soulhub`)
                    })
                    console.log(`${new Date().toJSON()} - restarted soulHub due to python process restarted`)
                }
                break;
            case 'process/status/souldapi':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                message.ts = new Date().getTime();
                processMonitorData['souldapi'] = message;
                break;
            case 'process/status/driver':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                processStatusDriver(topic,message)
                break;
            case 'process/status/udpServer':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                message.ts = new Date().getTime();
                processMonitorData['udpServer'] = message;
                break;
            case 'process/status/initProcess':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                message.ts = new Date().getTime();
                processMonitorData['initProcess'] = message;
                break;
            case 'process/status/systemActions':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                processMonitorData['systemActions'] = message;
                break;
            case 'process/status/get':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                let res = {};
                if (message.data.process == 'all') {
                    res = {
                        "type": "get_status_hub",
                        "dataArray": [processMonitorData],
                        "requestId": message.requestId,
                        "userId": message.userId,
                        "communicationId": message.communicationId
                    }
                    console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(res)}`);
                    mqttclient.publish("process/status/get_res", JSON.stringify(res))
                } else if(message.data.process == "driver"){
                    res = {
                        "type": "get_status_hub",
                        "dataArray": [driverStatusObj[message.data.driverName]],
                        "requestId": message.requestId,
                        "userId": message.userId,
                        "communicationId": message.communicationId
                    }
                    console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(res)}`);
                    mqttclient.publish("process/status/get_res", JSON.stringify(res))
                }else {
                    res = {
                        "type": "get_status_hub",
                        "dataArray": [processMonitorData[message.data.process]],
                        "requestId": message.requestId,
                        "userId": message.userId,
                        "communicationId": message.communicationId
                    }
                    console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(res)}`);
                    mqttclient.publish("process/status/get_res", JSON.stringify(res))
                }
                break;
            case 'process/status/memoryUsage':
                console.log(`${new Date().toJSON()} - processMonitor message - case - ${topic} - ${JSON.stringify(message)}`);
                Getcpudetails(message);
                break;
            case 'process/status/startStandalone':
                processMonitorData['startStandalone'] = message;
                break;
            case 'process/status/diagnostic':
                processMonitorData['diagnostic'] = message;
                break;
            default:
                console.log(`${new Date().toJSON()} -  message - case - default`);
                break;
        }
    }else{
        console.log(`${new Date().toJSON()} -  message - object not in json format`);
    }
})

