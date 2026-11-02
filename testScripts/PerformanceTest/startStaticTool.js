const StaticRecord = require("./staticTool/staticRecord");
const Config = require("./config");


async function activeStatic(){

    let wanOgmiosPids = new Array();
    for(let i=0; i<Config.OgmiosPids.length; i++){
        let itemPid = Config.OgmiosPids[i];
        wanOgmiosPids.push({"pid": itemPid.pid, "name": itemPid.name});
    }    

    let staticRecord = new StaticRecord(wanOgmiosPids);
    await staticRecord.activeRecord();

}


async function main(){

    await activeStatic();

}

main();


