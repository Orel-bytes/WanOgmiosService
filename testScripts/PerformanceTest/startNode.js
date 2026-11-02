const MpcNodeSimulator = require("./mpcNode/nodeSimulator");


async function activeMpcNode(){
    let mpcNodeObj = new MpcNodeSimulator();

    await mpcNodeObj.action();
}

async function main(){

    await activeMpcNode();

}

main();


