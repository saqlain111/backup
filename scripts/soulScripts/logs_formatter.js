require('shelljs/global');
const fs = require("fs");
const async = require('async');
const logger = require('soulLogger')
const log = logger.genriclog('soulSystem');
const infoLog = log[0].info;
const errorLog = log[1].error;
const debugLog = log[2].debug;

const remove_dir = (arr) => {
    try{
        async.each(arr, function(file, callback) {
           debugLog(` soulsystem - logs_formatter - remove_dir - Processing file ${file} -  -  -  -  - `);      
           infoLog(` soulsystem - logs_formatter - remove_dir - Processing file ${file} -  -  -  -  - `);      

            exec(`rm -rf /home/linaro/logs/${file}`, () => {
                debugLog(` soulsystem - logs_formatter - remove_dir - removed directory ${file} -  -  -  -  - `);      
                infoLog(` soulsystem - logs_formatter - remove_dir - removed directory ${file} -  -  -  -  - `);      
                callback();
            });
        }, function(err) {
            if (err) {
                debugLog(` soulsystem - logs_formatter - remove_dir - A file failed to process -  -  -  -  - `);      
                infoLog(` soulsystem - logs_formatter - remove_dir - A file failed to process -  -  -  -  - `); 
                errorLog(err)
            } else {
               infoLog(` soulsystem - logs_formatter - remove_dir - All files have been processed successfully -  -  -  -  - `); 
            }
        });
    }
    catch(err){
        errorLog(` soulsystem - logs_formatter - remove_dir - remove_dir_ERROR code#59501 -  -  -  -  - `);
        debugLog(` soulsystem - logs_formatter - remove_dir - remove_dir_ERROR code#59501 -  -  -  -  - `);
        errorLog(err);
    }
}

exec("ps aux | grep -i lib/start.js | awk {'print $2'} | xargs ps -o lstart= -p", (err, stdout, stderr) => {
   debugLog(` soulsystem - logs_formatter - exec - stdout ${stdout} -  -  -  -  - `);      
   infoLog(` soulsystem - logs_formatter - exec - stdout ${stdout} -  -  -  -  - `);      
   debugLog(` soulsystem - logs_formatter - exec - stdout.split("\n")[0] ${stdout.split("\n")[0]} -  -  -  -  - `);      
   infoLog(` soulsystem - logs_formatter - exec - stdout.split("\n")[0] ${stdout.split("\n")[0]} -  -  -  -  - `);      

    var d = new Date(stdout.split("\n")[0]);
    var ts_nodeps = d.getTime();
    var timestamp_5 = ts_nodeps - 432000000;
    debugLog(` soulsystem - logs_formatter - exec - Timestamp 5 days:${timestamp_5} -  -  -  -  - `);      
    infoLog(` soulsystem - logs_formatter - exec - Timestamp 5 days:${timestamp_5} -  -  -  -  - `);      
 
    var ts2_nodeps = timestamp_5;
    debugLog(` soulsystem - logs_formatter - exec - Date - 5 Days:${new Date(ts2_nodeps)} -  -  -  -  - `);      
    infoLog(` soulsystem - logs_formatter - exec - Date - 5 Days:${new Date(ts2_nodeps)} -  -  -  -  - `);      
 
    var logs = fs.readdirSync('/home/linaro/logs');
    infoLog(` soulsystem - logs_formatter - exec - logs ${logs} -  -  -  -  - `);      
    var dir_array = []
    logs.forEach(function(element, idx, array) {
        var isdir = fs.lstatSync('/home/linaro/logs/' + element).isDirectory();
        if (isdir) {
            var el = fs.lstatSync('/home/linaro/logs/' + element);
            if (Date.parse(el.birthtime) < ts2_nodeps) {
                dir_array.push(element);
            } else {
               infoLog(` soulsystem - logs_formatter - exec - Date - else birthtime greater than 5 times ${element} -  -  -  -  - `);      
            }
        }
        if (idx == array.length - 1) {
            if (dir_array.length != 0) {
                infoLog(` soulsystem - logs_formatter - exec - directories to be removed ${JSON.stringify(dir_array)} -  -  -  -  - `);      
                remove_dir(dir_array);
            } else {
               infoLog(` soulsystem - logs_formatter - exec - No Directory to be removed -  -  -  -  - `);      
            }
        }
    });
});