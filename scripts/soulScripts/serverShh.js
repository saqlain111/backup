require('shelljs/global');
const fs = require('fs')
const os = require("os");
const properties = require("properties");
const { exec } = require('child_process');
const platform = os.platform();
const options = { sections: true, comments: '#', separators: '=', strict: true, };

const deleteSshKey = (err) =>{
    console.log("deleting ssh keys")
    if(err == 255){
        exec(`cd /home/linaro/.ssh && sudo rm -rf known_hosts ; cd /root/.ssh && sudo rm -rf known_hosts ;sudo ssh-keygen -f "/root/.ssh/known_hosts" -R 13.232.149.147`,(err1)=>{
            if(!err1){
                console.log("keys deleted successfully");
            }else{
                console.log("error while deleting keys",err1);
            }
        });
    }
}

const setPort = () =>{
    try{
        if (platform == 'linux') {
            if (process.env.HUB_TYPE == 'alpha' || process.env.HUB_TYPE == 'beta' || process.env.HUB_TYPE == 'prod') {
                exec(`sudo systemctl stop ssh ; sudo systemctl start ssh ; timeout -s SIGKILL 2h sshpass -p SrPk7xaq ssh -o StrictHostKeyChecking=no -R ${process.argv[2]}:localhost:513 root@13.232.149.147`, (err) => {
                    if(err){
                        console.log("error while setting port",err);
                        deleteSshKey(255)
                    }else{
                        console.log("port set successfully")
                    }
                })
            }
        } else if (platform == 'darwin') {
            const MAC_ENV = require('/etc/hubenv');    
            const prop_data = fs.readFileSync(MAC_ENV, { encoding: 'utf8' });
            const prop_result = properties.parse(prop_data, options);
            var iobj = prop_result.installation;
            let HUB_TYPE = iobj.HUB_TYPE;
            if (HUB_TYPE == 'alpha' || HUB_TYPE == 'beta' || HUB_TYPE == 'prod') {
                exec(`sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist ; timeout -s SIGKILL 2h sshpass -p SrPk7xaq ssh -o StrictHostKeyChecking=no -R ${process.argv[2]}:localhost:22 root@13.232.149.147 ; sudo launchctl unload  /System/Library/LaunchDaemons/ssh.plist`)
            }
        }
    }catch(error){
        console.log("in catch err",error)
        deleteSshKey()
    }
}

setPort();
