

const _ = require('lodash');
const ps = require('current-processes');
const config = require("../config");

const TopProcessNum = config.TopProcessNum;

class QueryCpuMemUtil {

  constructor(){

    this.mapProcessRecord = undefined;
    this.processIds = undefined;
  }


  filtPidUsage(err, processes) {
    let self = this;
    
    let sorted = _.sortBy(processes, 'mem.usage'); // cpu
    let topProcessRecord  = sorted.reverse().splice(0, TopProcessNum);
    // console.log("\n... queryCpuMemoryData: ", topProcessRecord);

    let curTs = new Date().getTime();

    for(let i=0; i<this.processIds.length; i++){
      let tmpId = this.processIds[i].pid;
      console.log("\n\n...to handle processId: ", tmpId);

      for(let j=0; j<topProcessRecord.length; j++){
        let tmpRecord = topProcessRecord[j];
        // console.log("...to handle topProcessRecord: ", tmpRecord.pid);

        if(tmpId === tmpRecord.pid){

          let record = {
            "Name": tmpRecord.name,
            "TimeStamp": curTs,
            "Cpu": tmpRecord.cpu,
            "PrivateMem": tmpRecord.mem.private,
            "VirtualMem": tmpRecord.mem.virtual,
            "MemUsage": tmpRecord.mem.usage
          }
          console.log("...matched processId: ", tmpId, record);

          if(undefined === self.mapProcessRecord){
            console.log("new Map")
            self.mapProcessRecord = new Map();
          }
          self.mapProcessRecord.set(tmpId, record);
          console.log("this.mapProcessRecord...1: ", self.mapProcessRecord);
          
          break;
        }
      }
    }
  }


  queryCpuMemoryData(processIds){
    return new Promise((resove, reject) => {
      ps.get((err, processes) => {
        let mapProcessRecord = undefined;
        if (err) {
          return resove(mapProcessRecord);
        }      
        let sorted = _.sortBy(processes, 'mem.usage'); // cpu
        let topProcessRecord  = sorted.reverse().splice(0, TopProcessNum);
        // console.log("\n... queryCpuMemoryData: ", topProcessRecord);
    
        let curTs = new Date().getTime();
    
        for(let i=0; i<processIds.length; i++){
          let tmpId = processIds[i].pid;
          // console.log("\n\n...to handle processId: ", tmpId);
    
          for(let j=0; j<topProcessRecord.length; j++){
            let tmpRecord = topProcessRecord[j];
            // console.log("...to handle topProcessRecord: ", tmpRecord.pid);
    
            if(tmpId === tmpRecord.pid){
    
              let record = {
                "Pid": tmpId,
                "Name": tmpRecord.name,
                "TimeStamp": curTs,
                "Cpu": tmpRecord.cpu,
                "PrivateMem": tmpRecord.mem.private,
                "VirtualMem": tmpRecord.mem.virtual,
                "MemUsage": tmpRecord.mem.usage
              }
              // console.log("...matched processId: ", tmpId, record);
    
              if(undefined === mapProcessRecord){
                // console.log("new Map")
                mapProcessRecord = new Map();
              }
              mapProcessRecord.set(tmpId, record);
              // console.log("this.mapProcessRecord...1: ", mapProcessRecord);              
              break;
            }
          }
        }
        return resove(mapProcessRecord);
      });
    })

  }

};

module.exports = QueryCpuMemUtil;
