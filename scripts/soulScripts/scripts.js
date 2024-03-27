require('shelljs/global');
const constants = require('../soulUtils/constants')

module.exports = {
    killSoulHub: (cb) => {
        console.log('Killing soul hub process')
        chmod(777, `${constants.SOUL_SCRIPTS}/kill-soul-hub.sh`)
        exec(`${constants.SOUL_SCRIPTS}/kill-soul-hub.sh`)
        if (cb) cb()
    },
    startSoulHub: (cb) => {
        console.log('Starting soul hub process')
        chmod(777, `${constants.SOUL_SCRIPTS}/start_soul_hub.sh`)
        exec(`${constants.SOUL_SCRIPTS}/start_soul_hub.sh`)
        if (cb) cb()
    },
    startUdpServer: (cb) => {
        console.log('Starting udp server process')
        chmod(777, `${constants.SOUL_SCRIPTS}/run_udp_server.sh`);
        exec(`${constants.SOUL_SCRIPTS}/run_udp_server.sh`);
        if (cb) cb()
    }
}