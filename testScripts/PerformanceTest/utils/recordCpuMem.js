
const fs = require('fs');
const xlsx = require("node-xlsx");
const config = require("../config");

const NodeAccessInterval = config.NodeAccessInterval;
const RecordInterval = config.RecordInterval; //30*60*1000
const PerformanceTitle = config.PerformanceTitle;

class RecordCpuMemUtil {
  constructor(processId, processName){

    this.processId = processId;
    this.processName = processName;

    this.mapStaticRslt = new Map();
    this.periodInitialRecord = undefined;
    this.periodLastRecord = undefined;
  }

  // let record = {  
  //   "Pid": tmpRecord.pid,
  //   "Name": tmpRecord.name,
  //   "TimeStamp": curTs,
  //   "Cpu": tmpRecord.cpu,
  //   "PrivateMem": tmpRecord.mem.private,
  //   "VirtualMem": tmpRecord.mem.virtual,
  //   "MemUsage": tmpRecord.mem.usage
  // }
  recordCpuMemoryData(record){
    console.log("\n***recordCpuMemoryData: ", this.processId, this.mapStaticRslt, record);

    if(this.processId !== record.Pid){
      return;
    }

    console.log("\n***record data: ", record);

    if(0 === this.mapStaticRslt.size){
      this.periodInitialRecord = record;
    }
    this.mapStaticRslt.set(record.TimeStamp, record);

    if(RecordInterval <= (record.TimeStamp-this.periodInitialRecord.TimeStamp)){  
      this.periodLastRecord = record;

      this.static();

      this.periodInitialRecord = undefined;
      this.periodLastRecord = undefined;
      this.mapStaticRslt = undefined;
      this.mapStaticRslt = new Map();
    }

    return true;
  }


  static(){

    console.log("\n***record static data begain: "); 

    let xlsxSheet = {
      name: PerformanceTitle, 
      data: new Array
    }

    let rawDefine = [
      "Name",
      "TimeStamp",
      "Cpu",
      "PrivateMem",
      "VirtualMem",
      "MemUsage"
    ];
    xlsxSheet.data.push(rawDefine);

    for(let item of this.mapStaticRslt.values()){ 

      let staticItem = [item.Name, item.TimeStamp, item.Cpu, item.PrivateMem, item.VirtualMem, item.MemUsage];
      
      xlsxSheet.data.push(staticItem);
    }

    xlsxSheet.data.push([]);

    let staticRawDefine = [
      "",
      "Durance",
      "CpuIncrease",
      "PrivateMemIncrease",
      "VirtualMemIncrease",
      "MemUsageIncrease"
    ];
    xlsxSheet.data.push(staticRawDefine);

    let durance = (this.periodLastRecord.TimeStamp - this.periodInitialRecord.TimeStamp)/1000;
    let CpuIncrease = this.periodLastRecord.Cpu - this.periodInitialRecord.Cpu;
    let PrivateMemIncrease = this.periodLastRecord.PrivateMem - this.periodInitialRecord.PrivateMem; 
    let VirtualMemIncrease = this.periodLastRecord.VirtualMem - this.periodInitialRecord.VirtualMem; 
    let MemUsageIncrease = this.periodLastRecord.MemUsage - this.periodInitialRecord.MemUsage; 
    xlsxSheet.data.push(['Total Static', durance, CpuIncrease, PrivateMemIncrease, VirtualMemIncrease, MemUsageIncrease]);


    let xlsxContent = new Array();
    xlsxContent.push(xlsxSheet);
    let xlsxBuf = xlsx.build(xlsxContent);

    // 写入文件
    fs.writeFile(`Static_${this.processName}_${NodeAccessInterval}_${config.MpcNodeNum}_${this.periodLastRecord.TimeStamp}.xlsx`, xlsxBuf, function(err) {
      if (err) {
          console.log("Write failed: " + err);
          return;
      }
      console.log("Write completed.");
    });


    console.log("\n***record static data end: "); 
  }

};

module.exports = RecordCpuMemUtil;
