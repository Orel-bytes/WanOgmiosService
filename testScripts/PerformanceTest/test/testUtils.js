const QueryUtil = require("../utils/queryCPUMem");
const RecordUtil = require("../utils/recordCpuMem");
const axiosUtil = require("../utils/axiosRequest");
const config = require("../config");
const MpcNodeSimulator = require("../mpcNode/nodeSimulator");

const testTTl = 2*config.RecordInterval;

function sleep(time) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, time);
    })
}

async function testScript(){

    const myProcessId = new Array();
    myProcessId.push({"pid": 5504, "name":"code"});
    myProcessId.push({"pid": 3876, "name":"unity-panel-ser"});
    
    let queryUtilObj = new QueryUtil();
    let mapRecordUtilInst = new Map();

    for(let i=0; i<myProcessId.length; i++){
        let tmpProcess = myProcessId[i];
        let tmpRecordUtil = new RecordUtil(tmpProcess.pid, tmpProcess.name);

        mapRecordUtilInst.set(tmpProcess.pid, tmpRecordUtil);
    }

    let InitalTS = new Date().getTime();
    console.log("...InitalTS: ", InitalTS);
    let finalTs = InitalTS + testTTl; 
    
    do{
        let mapQryRslt = await queryUtilObj.queryCpuMemoryData(myProcessId);
        console.log("\n\n queryCpuMemoryData: ", mapQryRslt);

        if(undefined === mapQryRslt){

        }else{
            for(let key of mapQryRslt.keys()){
                let processRecord = mapQryRslt.get(key);
                console.log("pid: ", key);
    
                let tmpInst = mapRecordUtilInst.get(key);
                console.log("get mapRecordUtilInst: ", tmpInst);
                tmpInst.recordCpuMemoryData(processRecord);
            } 
            
            let tmpCurTs = new Date().getTime();        
            if(finalTs < tmpCurTs){
                break;
            }

        }

        await sleep(5*1000);

    }while(true);

}

//生成从minNum到maxNum的随机数
function randomNum(minNum,maxNum){ 
    switch(arguments.length){ 
        case 1: 
            return parseInt(Math.random()*minNum+1,10); 
        break; 
        case 2: 
            return parseInt(Math.random()*(maxNum-minNum+1)+minNum,10); 
        break; 
            default: 
                return 0; 
            break; 
    } 
} 

async function axiosRequest(cmdId){
    let ogmiosServer = "http://52.13.9.234:4337";
    let reqObj = new axiosUtil(ogmiosServer);

    console.log("axios request cmd id:", cmdId);
    reqObj.handleRequest(cmdId);
}

async function activeMpcNode(){
    let mpcNodeObj = new MpcNodeSimulator();

    await mpcNodeObj.action();
}

async function main(){

    // await testScript();

    // let cmdId = randomNum(0, 10)
    // axiosRequest(cmdId);

    await activeMpcNode();

}

main();


