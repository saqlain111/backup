require('shelljs/global');
const async = require('async');
const osmod = require('os');
const home = osmod.homedir();

let array = [],
    needToInstall = {},
    asyncarray = [],
    object = {},
    data;

let predefined = {
    "inert": "5.1.3",
    "sonos": "1.13.2",
    "winston": "3.3.3",
    "request-progress": "3.0.0",
    "tplink-smarthome-api": "3.3.0",
    "fast-xml-parser": "4.0.9",
    "jsonwebtoken":"8.5.1",
    "socket.io":"4.6.1",
    "socket.io-client":"4.6.1",
    "@suisse00/wiz-local-control": "1.2.2"
}


exec(`mv /home/linaro/temp/package-lock.json /home/linaro/temp/package-lock.json_`)

data = exec(`npm ls --json --depth=0`);
data = JSON.parse(data);
array = Object.keys(data.dependencies);

for (let i in array) {
    let element = array[i]
    object[element] = data.dependencies[element].version
}

let predefinedModuleKeys = Object.keys(predefined);
let module_Keys = predefinedModuleKeys.filter((eachModuleName) => {
    if (!object.hasOwnProperty(eachModuleName) || (object.hasOwnProperty(eachModuleName) && object[eachModuleName] != predefined[eachModuleName])) {
        needToInstall[eachModuleName] = predefined[eachModuleName];
        return needToInstall
    }
});

console.log("\nNeed to install these node modules " + JSON.stringify(needToInstall));

if (Object.keys(needToInstall).length > 0) {
    let needToInstallKeys = Object.keys(needToInstall);

    needToInstallKeys.forEach((eachModuleName, index, arr) => {
        let fn = eachModuleName + '@' + needToInstall[eachModuleName]
        asyncarray.push(fn)
        const install = function (module, callback) {
            exec(`npm install ${module}`);
            callback()
        }
        if (index == (arr.length - 1)) {
            let tasks = asyncarray;
            if (tasks.length == 0) {
                console.log("Nothing to install...");
            } else {
                console.log("tasks....", tasks);
                async.each(tasks, install, (err) => {
                    if (err) {
                        console.log("Something went wrong...");
                        console.log(err);
                    }else{
                        console.log("Installation process completed");
                        console.log("Rebooting hub to complete installation of npm modules...");
                        let obj = JSON.stringify({ action: "module-checker Installation process completed", Path: process.env.PWD, Timestamp: new Date().toJSON(), User: process.env.USER })
                        exec(`echo ${obj} >> ${home}/logs/core/reboot.log`);
                        exec(`sudo reboot`);
                    }
                    
                })
            }
        }
    });
} else {
    console.log("Nothing to install. All node modules are installed.");
    process.exit();
}