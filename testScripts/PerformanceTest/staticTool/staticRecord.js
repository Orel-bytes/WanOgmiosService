const QueryUtil = require("../utils/queryCPUMem");
const RecordUtil = require("../utils/recordCpuMem");
const Config = require("../config");

const TestTTL = 2*Config.StaticSleepTime;

class StaticRecord {

    constructor(servicePids){

        this.wanOgmiosPids = servicePids;
        // wanOgmiosPids.push({"pid": 5504, "name":"code"});
        // wanOgmiosPids.push({"pid": 3876, "name":"unity-panel-ser"});
    }

    sleep(time) {
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                resolve();
            }, time);
        })
    }
    
    async activeRecord(){
    
        
        let queryUtilObj = new QueryUtil();
        let mapRecordUtilInst = new Map();
    
        for(let i=0; i<this.wanOgmiosPids.length; i++){
            let tmpProcess = this.wanOgmiosPids[i];
            let tmpRecordUtil = new RecordUtil(tmpProcess.pid, tmpProcess.name);
    
            mapRecordUtilInst.set(tmpProcess.pid, tmpRecordUtil);
        }
    
        let InitalTS = new Date().getTime();
        console.log("...InitalTS: ", InitalTS);
        let finalTs = InitalTS + TestTTL; 
        
        do{
            let mapQryRslt = await queryUtilObj.queryCpuMemoryData(this.wanOgmiosPids);
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
                
                // let tmpCurTs = new Date().getTime();        
                // if(finalTs < tmpCurTs){
                //     break;
                // }    
            }
    
            await this.sleep(Config.StaticSleepTime);
    
        }while(true);
    
    }

};

module.exports = StaticRecord;





