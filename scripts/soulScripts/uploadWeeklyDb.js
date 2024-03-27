'use strict';

require('shelljs/global');

const request = require('request');
const fs = require('fs');
const dns = require('dns');
const mqtt = require('mqtt')
const EventEmitter = require('events');
const os = require('os');
const crypto = require('crypto')
let platform = os.platform();
class MyEmitter extends EventEmitter { }
const myEmitter = new MyEmitter();
let filenameArr = [];
let GROUP;
let HOME;
let OWNER = 'linaro';
if (platform == "linux") {
    HOME = "/home/linaro"+'/';
    GROUP = "linaro";
} else {
    HOME = os.homedir() + '/';
    GROUP = "staff";
}
let hubSerial = fs.readFileSync(`${HOME}/db/serial`, 'utf-8').trim();
let pass = '@$0uL$y$tem';
const SERVER = fs.readFileSync(`${HOME}/db/server`, 'utf-8').trim();
console.log("hubSerialhubSerial : ", hubSerial);
console.log("SERVER  ", SERVER);

const MQTT_HOST = process.env.base_ip ? process.env.base_ip : '0.0.0.0';
const MQTT_PORT = process.env.broker_port ? process.env.broker_port : '8886';
const mqttSubscribeTopics = ['soulDb/dbResponse/systemdbresponse', 'maintenance/weeklydbUpload'];

const runWeeklyBakcupScript = () => {
    try {
        console.log("uploadWeeklyDb : In the function : ");
        var communicationId = new Date().getTime() + 'dbRestore' + crypto.randomBytes(1).toJSON().data[0];
        mqttclient.publish('systemAction/weeklydbUpload', JSON.stringify({ communicationId: communicationId }));
    } catch (error) {
        console.log("uploadWeeklyDb : Exception occured !");
        console.log(error);
    }
}

const uploadWeeklyDb = (iData) => {
    try {
        if (iData && iData.data.hasOwnProperty('weeklyDbuploadflag') && iData.data.weeklyDbuploadflag) {
            console.log("uploadWeeklyDb : Upload the weeklyDb");
            dns.resolve('www.google.com', (err) => {
                if (!err) {
                    console.log("uploadWeeklyDb : ");
                    let file = hubSerial + '_tar.gz'
                    console.log("File----------: ", file);
                    console.log("Acknow send to B>E: ")
                    exec(`cd ${HOME}/logs && tar -C ${HOME} -cvzf ${file} db localassets`, (err1) => {
                        if (!err1) {
                            let token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ2aW5heS5tdWxleUBjbG91emVyLmNvbSIsInVzZXJuYW1lIjoidmluYXkubXVsZXlAY2xvdXplci5jb20iLCJ1c2VyRW1haWwiOiJ2aW5heS5tdWxleUBjbG91emVyLmNvbSIsInVzZXJVSUQiOiJ2aW5heS5tdWxleUBjbG91emVyLmNvbSIsInVzZXJOYW1lIjoidmluYXkubXVsZXlAY2xvdXplci5jb20iLCJmaXJzdE5hbWUiOiJWaW5heSIsImxhc3ROYW1lIjoiTXVsZXkiLCJzdGF0dXMiOiIxIiwicHJvZmlsZV9kYXRhIjoic3NzcyIsIkNNTF9MT0NBVElPTiI6IktvdGhydWQiLCJDTUxfQUREUkVTU19MSU5FMiI6IlB1bmUiLCJDTUxfQ09OVEFDVF9OTyI6InNkYWtzZGNrYSIsIlJFQ09WRVJZX01BSUwiOiJtdWxleXZpbmF5OTZAZ21haWwuY29tIiwiaWF0IjoxNTk5MTI4NjE3fQ.YoMgIhl80tD6_-d215EndEoDHkqY1EOGZJSnt8dcfVNPVQEOlwXYmpYk1j0I3zdYHdp2PCB5cjIzp0W1F_Wsxm97d72U8zrWX02sNTDN2dnLOroeoBVoeVi2TZEZkjEJtGnrT4ifRwUbsTdDkGSUBN4WzOIU3mTMvzjj2HFjmJV1eP0e1zKnat8I-OknYaBPBd7aaHoFXGWRIfzjaaP0xMNkBKsMl9yE4SkLoCdF4srgCpwJFLqDX-lcqkL0MIN7xyPKsR-Vt25XHEPV1bY4jGfADPDXUxh-4n2vik-DUvyJqNqhnqXQAPmly0Bow7gt8wkc6rIbacYM8NyhrUvm-w" //"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbkBjbG91ZHNtYWludGVuYW5jZS5jbG91emVyLmNvbSIsInVzZXJuYW1lIjoiYWRtaW5AY2xvdWRzbWFpbnRlbmFuY2UuY2xvdXplci5jb20iLCJSRUNPVkVSWV9NQUlMIjoiYWRtaW5AY2xvdXplci5jb20iLCJmaXJzdE5hbWUiOiJjbG91emVyIiwibGFzdE5hbWUiOiJ1c2VyIiwiaWF0IjoxNjA0NTg4Nzk2LCJleHAiOjE2MDcxODA3OTZ9.csjO4geVOO3Zkvfp7OrK6vOju2vpyd_QOUR9fj6Zx3j3RqVRRg7i4Bu8CCOllyFGI1pstbubM7sITSSQgdwJ-YUySKbJx_PCsAhXktvcbND5vMtYqiCbN3EHMMG6ooRQibvRWJydlVZAiLijVfDva4fwjLUvQr3Pu74diD5G4RZW3NpdswH-t5kLPDw8jVTBapVbElcozVNUP5uKU2lLzqm6jw-JkEYZtmidNK4dftfOIwfy7ytTdJgbMN6DLyR0taEDPDqOevZyBPRTCA__bBvJW7i7Gk9uQa7xeyNAaBOfYKjf0UmEzEs2Ms-K8mtqrZn529RiLOQNDY7AJFhdpA" //"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJodWJJZCI6IkNMT1VaRVJTT1VMLTEwIiwiaHViQXV0aElkIjoiU3pteElJdjNoYmwwIiwic3RhdHVzIjoiMSIsInRva2VuIjp0cnVlLCJpYXQiOjE2MDQ0NTE2MTR9.ofB3TXsvSI0fi854BiQZNo-5Ecb0IJ75RQl5rMLXRRPK_3eMEbQkvaLSvgva_OqB6E-U7NVF1HQ4dQ8Rx0DHnMn_AeYRZi8DY5BhV_hGgY3HBCW5YgsPkHOKSgo02_6znu3jwnPwnDJ9EHvWu9_1PpL_2IsohLk2twfr5gA_lnfJryuWILAKIp0kHPn8RwQam2H9XQYknCdm85Hxxz7NAlFEDoYuSBoAXNXBJO5s6vUwpoKPJGHKUHzriCGpaxL8AR6txI293xZKn4f-WB_6J11mMA2h9uHv6nde73wf1gXA4oG4Vp3zu8LoQbMC6xBTv4AyMSksOfqwbwFjUJLG5w"
                            const upload = (keyval) => {
                                let formData = {
                                    hubId: hubSerial,
                                    stream: fs.createReadStream(`${HOME}/logs/${file}`),
                                    keyVal: keyval,
                                };
                                request.post({
                                    url: `${SERVER}/V2dbBackup`,
                                    formData: formData,
                                    headers: {
                                        "Authorization": token,
                                        "ContentType": "application/gzip"
                                    }
                                },
                                    function (err2, response, body) {
                                        if (err2) {
                                            console.log("uploadWeeklyDb : Error while uploading the weekly Db to backEnd", err2);

                                        }
                                        if (response && response.statusCode == 200) {
                                            console.log("uploadWeeklyDb : Backup uploaded successFully", body);
                                            fs.writeFileSync(`${HOME}/db/dbBackupTime`, new Date());
                                            fs.writeFileSync(`${HOME}/db/weeklyuploadTime`, body);
                                            let communicationId = new Date().getTime() + 'weeklydbBackup' + crypto.randomBytes(1).toJSON().data[0];
                                            mqttclient.publish('systemAction/weeklydbUploadSuccess', JSON.stringify({ communicationId: communicationId, data: { body: body, type: 'db' } }));
                                            setTimeout(function () {
                                                if (file) {
                                                    console.log("uploadWeeklyDb : File to be removed from the hub");
                                                    console.log(file);
                                                    exec(` cd ${HOME}/logs && rm -rf ${file}`);
                                                    //process.exit(0);
                                                }
                                            }, 3000);
                                        }
                                    });
                            }
                            const fetchHubInfo = () => {
                                let communicationId1 = new Date().getTime() + 'getSoulInfo' + crypto.randomBytes(1).toJSON().data[0];
                                let existshubKeyVal = fs.existsSync(`${HOME}/db/hubKeyVal`, 'utf-8');
                                let keyval;
                                if (existshubKeyVal) {
                                    keyval = fs.readFileSync(`${HOME}/db/hubKeyVal`, 'utf-8').trim();
                                }
                                if (keyval) {
                                    upload(keyval)
                                } else {
                                    mqttclient.publish('soulDb/fetch', JSON.stringify({
                                        data: {
                                            entity_type: 'hubInfo',
                                        },
                                        communicationId: communicationId1,
                                        clientId: "systemdbresponse" + new Date().getTime()
                                    }));

                                    myEmitter.on(communicationId1, (hubInfo) => {
                                        upload()
                                    })
                                }
                            }
                            console.log("uploadWeeklyDb : dataFromDbCreds : ", token);
                            if (token) {
                                fetchHubInfo()
                            } else {
                                let communicationId = new Date().getTime() + 'getCredentailsDetails' + crypto.randomBytes(1).toJSON().data[0];
                                mqttclient.publish('soulDb/fetch', JSON.stringify({
                                    data: {
                                        entity_type: 'credentials',
                                    },
                                    communicationId: communicationId,
                                    clientId: "systemdbresponse" + new Date().getTime()
                                }));
                                myEmitter.on(communicationId, (dataFromDbCreds) => {
                                    fetchHubInfo()
                                })
                            }
                        } else {
                            console.log("Errrrrrrrrrrrrrrrrrrr : :", err1)
                        }
                    })

                } else {
                    console.log("uploadWeeklyDb : runWeeklyBakcupScript : Weekly db could not be uploaded to server as No internate connectivity");
                }
            })
        }

    } catch (error) {
        console.log("uploadWeeklyDb : uploadWeeklyDb : Exception occured !");
        console.log(error);
    }
}

const uploadLogs = () => {
    try {
        console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs : In the function`);
        let token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ2aW5heS5tdWxleUBjbG91emVyLmNvbSIsInVzZXJuYW1lIjoidmluYXkubXVsZXlAY2xvdXplci5jb20iLCJ1c2VyRW1haWwiOiJ2aW5heS5tdWxleUBjbG91emVyLmNvbSIsInVzZXJVSUQiOiJ2aW5heS5tdWxleUBjbG91emVyLmNvbSIsInVzZXJOYW1lIjoidmluYXkubXVsZXlAY2xvdXplci5jb20iLCJmaXJzdE5hbWUiOiJWaW5heSIsImxhc3ROYW1lIjoiTXVsZXkiLCJzdGF0dXMiOiIxIiwicHJvZmlsZV9kYXRhIjoic3NzcyIsIkNNTF9MT0NBVElPTiI6IktvdGhydWQiLCJDTUxfQUREUkVTU19MSU5FMiI6IlB1bmUiLCJDTUxfQ09OVEFDVF9OTyI6InNkYWtzZGNrYSIsIlJFQ09WRVJZX01BSUwiOiJtdWxleXZpbmF5OTZAZ21haWwuY29tIiwiaWF0IjoxNTk5MTI4NjE3fQ.YoMgIhl80tD6_-d215EndEoDHkqY1EOGZJSnt8dcfVNPVQEOlwXYmpYk1j0I3zdYHdp2PCB5cjIzp0W1F_Wsxm97d72U8zrWX02sNTDN2dnLOroeoBVoeVi2TZEZkjEJtGnrT4ifRwUbsTdDkGSUBN4WzOIU3mTMvzjj2HFjmJV1eP0e1zKnat8I-OknYaBPBd7aaHoFXGWRIfzjaaP0xMNkBKsMl9yE4SkLoCdF4srgCpwJFLqDX-lcqkL0MIN7xyPKsR-Vt25XHEPV1bY4jGfADPDXUxh-4n2vik-DUvyJqNqhnqXQAPmly0Bow7gt8wkc6rIbacYM8NyhrUvm-w" //"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbkBjbG91ZHNtYWludGVuYW5jZS5jbG91emVyLmNvbSIsInVzZXJuYW1lIjoiYWRtaW5AY2xvdWRzbWFpbnRlbmFuY2UuY2xvdXplci5jb20iLCJSRUNPVkVSWV9NQUlMIjoiYWRtaW5AY2xvdXplci5jb20iLCJmaXJzdE5hbWUiOiJjbG91emVyIiwibGFzdE5hbWUiOiJ1c2VyIiwiaWF0IjoxNjA0NTg4Nzk2LCJleHAiOjE2MDcxODA3OTZ9.csjO4geVOO3Zkvfp7OrK6vOju2vpyd_QOUR9fj6Zx3j3RqVRRg7i4Bu8CCOllyFGI1pstbubM7sITSSQgdwJ-YUySKbJx_PCsAhXktvcbND5vMtYqiCbN3EHMMG6ooRQibvRWJydlVZAiLijVfDva4fwjLUvQr3Pu74diD5G4RZW3NpdswH-t5kLPDw8jVTBapVbElcozVNUP5uKU2lLzqm6jw-JkEYZtmidNK4dftfOIwfy7ytTdJgbMN6DLyR0taEDPDqOevZyBPRTCA__bBvJW7i7Gk9uQa7xeyNAaBOfYKjf0UmEzEs2Ms-K8mtqrZn529RiLOQNDY7AJFhdpA" //"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJodWJJZCI6IkNMT1VaRVJTT1VMLTEwIiwiaHViQXV0aElkIjoiU3pteElJdjNoYmwwIiwic3RhdHVzIjoiMSIsInRva2VuIjp0cnVlLCJpYXQiOjE2MDQ0NTE2MTR9.ofB3TXsvSI0fi854BiQZNo-5Ecb0IJ75RQl5rMLXRRPK_3eMEbQkvaLSvgva_OqB6E-U7NVF1HQ4dQ8Rx0DHnMn_AeYRZi8DY5BhV_hGgY3HBCW5YgsPkHOKSgo02_6znu3jwnPwnDJ9EHvWu9_1PpL_2IsohLk2twfr5gA_lnfJryuWILAKIp0kHPn8RwQam2H9XQYknCdm85Hxxz7NAlFEDoYuSBoAXNXBJO5s6vUwpoKPJGHKUHzriCGpaxL8AR6txI293xZKn4f-WB_6J11mMA2h9uHv6nde73wf1gXA4oG4Vp3zu8LoQbMC6xBTv4AyMSksOfqwbwFjUJLG5w"
        dns.resolve('www.google.com', (err) => {
            if (!err) {
                console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs : uploadWeeklyLogs`);
                let d = new Date();
                let _dateWithMonthAndYear = d.toISOString().slice(0, 10);
                filenameArr.push(_dateWithMonthAndYear + "_" + new Date().getTime() + "_" + hubSerial + '_log.tar.gz');
                console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs File----------${filenameArr}`);
                const uploadFunc = (file) => {
                    exec(`
                    cd ${HOME} 
                    rm -rf demo.txt
                    rm -rf *.tar.gz
                    LogsDirSize=$(expr $(du -s ${HOME}logs/|awk '{print $1}'))
                    echo $LogsDirSize
                    echo 'creating logs tar'
                    if [ $LogsDirSize -lt 1736032 ];then
                    echo 'create logs dir tar'
                    cd ${HOME} && tar -cvzf ${file} logs/* 
                    else
                    echo 'create logs files tar'
                    for logfolder in logs 
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
                            console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - Exception - exce occure while Creating log tar ${err}`);
                        }
                        exec(`chown ${OWNER}:${GROUP} ${HOME}${file}`);
                        console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - successfully created tar ${file}`);
                        if (token) {
                            let existshubKeyVal = fs.existsSync(`${HOME}/db/hubKeyVal`, 'utf-8');
                            let keyval;
                            if (existshubKeyVal) {
                                keyval = fs.readFileSync(`${HOME}/db/hubKeyVal`, 'utf-8').trim();
                            }
                            let formData = {
                                hubId: hubSerial,
                                stream: fs.createReadStream(`${HOME}` + file),
                                name: file,
                                windowId: Math.floor(crypto.randomBytes(1).toJSON().data[0] * (10000 - 1)),
                                type: 'uploadHubLogs',
                                hubGeneration: "V2",
                                size: fs.statSync(`${HOME}` + file).size,
                                id: 'admin@cloudsmaintenance.clouzer.com',
                                keyVal: keyval,
                            };
                            let progress1 = 0;
                            console.log(`${new Date().toJSON()} - form data: ${JSON.stringify(formData)}`);
                            request.post({
                                url: `${SERVER}/V2dbBackup`,
                                formData: formData,
                                headers: {
                                    "Authorization": token,
                                    "ContentType": "application/gzip"
                                }
                            }, function (err2, response, body) {
                                if (response && response.hasOwnProperty("statusCode")){
                                    console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - log file upload status code: ${response.statusCode}`);
                                    if(response.statusCode != 200){
                                        process.exit(1);
                                    }                                }
                                if (err2) {
                                    console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - Error while uploading the weekly Db to backEnd error : ${err2}`);
                                }
                                if (response && response.statusCode == 200) {
                                    console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - response body: ${body}`);
                                    console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - Backup uploaded successFully`);
                                    let communicationId = new Date().getTime() + 'weeklylogsBackup' + crypto.randomBytes(1).toJSON().data[0];
                                    mqttclient.publish('systemAction/weeklydbUploadSuccess', JSON.stringify({ communicationId: communicationId, data: { body: body, type: 'logs' } }));
                                    setTimeout(function () {
                                        if (file) {
                                            console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - File to be removed from the hub ${file}`);
                                            exec(` cd ${HOME}/logs && rm -rf ${file}`);
                                            process.exit(0);
                                        }
                                    }, 3000);
                                }
                                if (file) {
                                    filenameArr.splice(0, 1)
                                    if (filenameArr.length > 0) {
                                        uploadFunc(filenameArr[0])
                                    }
                                    console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - removing file : ${file}`)
                                    exec(` rm ${HOME}/${file}`)
                                    exec(` rm -rf ${HOME}/demo.txt`)
                                }
                            })
                                .on('error', (err1) => {
                                    console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs  progress error file#${file} -  -  -  -  - `);
                                    console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs  progress error obje#${err1} -  -  -  -  - `);
                                })
                                .on('data', function (chunk) {
                                    progress1 += chunk.length;
                                    let stats = fs.statSync(`${HOME}` + file).size;
                                    let perc = parseInt((progress1 / stats) * 100);
                                    console.log('upload', perc, "uploading log file", 'log')
                                    console.log(`${new Date().toJSON()} -  uploadWeeklyDb : uploadLogs - data progress percent file#${file} - ${perc} -  -  -  - `);
                                })
                                .on('end', () => {
                                    console.log('upload', 100, "uploading log file", 'log')
                                    console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - data progress percent file#${file} - ${100} -  -  -  - `);
                                });
                        }
                    });
                }
                if (filenameArr.length > 0 && filenameArr.length == 1) {
                    uploadFunc(filenameArr[0])
                }
            }
        })
    } catch (error) {
        console.log(`${new Date().toJSON()} - uploadWeeklyDb : uploadLogs - Exception occured !! ${error}`);
    }
}

let weeklyDbId = 'weeklyDb_' + hubSerial;
let willPayload = { clientId: 'weeklyDb' + new Date().getTime() };
const mqttclient = mqtt.connect('mqtt://' + MQTT_HOST + ':' + MQTT_PORT, {
    username: 'CEDSystem',
    password: pass,
    will: {
        topic: 'weeklyDbDisconnected',
        payload: JSON.stringify(willPayload)
    },
    clientId: weeklyDbId,
    reconnectPeriod: 100000,
});

mqttclient.on('connect', () => {
    console.log(`uploadWeeklyDb : connected to - ${MQTT_HOST}`);
    mqttclient.subscribe(mqttSubscribeTopics);
    runWeeklyBakcupScript();
});

mqttclient.on('close', () => {
    console.log("uploadWeeklyDb : Mqtt client disconnected from server");
});

mqttclient.on('end', () => {
    console.log("uploadWeeklyDb :  mosquitto client end event triggered");
});

mqttclient.on('message', (topic, message1) => {
    try {
        console.log(`uploadWeeklyDb : Mqtt message - ${message1.toString()} on topic ${topic}`);
        let message = JSON.parse(message1.toString());
        switch (topic) {
            case 'soulDb/dbResponse/systemdbresponse':
                console.log("uploadWeeklyDb : dbResponse ");
                myEmitter.emit(message.communicationId, message.data);
                break;
            case 'maintenance/weeklydbUpload':
                console.log("uploadWeeklyDb : maintenance/weeklydbUpload : ");
                uploadWeeklyDb(message);
                uploadLogs();
                break
            default:
                console.log("uploadWeeklyDb : Default topic " + topic);
                break;
        }
    } catch (error) {
        console.log("uploadWeeklyDb : Exception occured on message")
        console.log(error);
    }
})