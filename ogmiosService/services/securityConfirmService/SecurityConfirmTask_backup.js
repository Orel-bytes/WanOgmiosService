
const BaseTask = require('../taskservice/BaseTask.js');
const ServiceFramework = require("../../framework/ServiceFramework");
const BlockFrostChecker = require("./BlockFrostChecker");
const MaestroChecker = require("./MaestroChecker");



class SecurityConfirmTask extends BaseTask {
  constructor(securityConfirmCfg, tokenFilterOption, mapDbInstance, confirmBlockBegin, preSyncedBlockNo) {
    super();

    // service task config
    this.chainID = "ADA";
    this.serviceID = securityConfirmCfg.securityConfirmServiceID;
    this.retryInterval = securityConfirmCfg.retryInterval;

    // security check config
    this.securityConfirmEnable = securityConfirmCfg.securityConfirmEnable; 
    this.securityBlockNum = securityConfirmCfg.securityBlockNum;
    this.delayBlockNum = securityConfirmCfg.delayBlockNum;
    this.confirmBlockStep = securityConfirmCfg.confirmStep;
    this.maxValidBlockMargin = securityConfirmCfg.maxValidBlockMargin;

    this.tokenFilterOption = tokenFilterOption;
    this.chainSyncDbInst = mapDbInstance.get("syncedRecord");
    this.blockInfoDbInst = mapDbInstance.get("blockRecord");
    this.mintInfoDbInst = mapDbInstance.get("mintRecord");
    this.confirmDbInst = mapDbInstance.get("confirmedRecord");

    this.preSyncedBlockNo = preSyncedBlockNo;
    this.curSyncedBlockNo = undefined;
    this.confirmBlockBegin = confirmBlockBegin;
    this.confirmBlockEnd = undefined;

    // module config
    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.storageSrvIns = ServiceFramework.getService("StorageServiceInterface", "StorageService");
    this.taskSchedule = ServiceFramework.getService("TaskServiceInterface", "taskSchedule");
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
  
    // security checker instance
    this.securityChecker = undefined;
    if ("blockFrost" === securityConfirmCfg.externalSource) {
      this.securityChecker = new BlockFrostChecker(securityConfirmCfg.blockFrostConfig);
      this.securityChecker.init();

    }else if("maestro" === securityConfirmCfg.externalSource){
      this.securityChecker = new MaestroChecker(securityConfirmCfg.maestroConfig);
      this.securityChecker.init();
    }
  }

  // based func
  init() {
    this.setId();
    return true;
  }

  setId() {
    this.Id = this.serviceID;
  }

  getId() {
    return this.Id;
  }

  isRepeated() {
    return false; // wait to check 
  }

  setNextStartTime(time) {
  }

  static askTask() {
  }


  // Part 2: security confirm handle
  async checkCurSyncedBlock(){
    try{
      let filter = {
          "chainType": "ADA"
      };

      let latestBlockPoint = await this.chainSyncDbInst.findByOption(filter);
      if(undefined === latestBlockPoint){
        console.log("\n\n....getLatestSyncedBlock...get synced block undefined.");
        return false;
      }

      this.curSyncedBlockNo = latestBlockPoint[0].blockHeight;
      return true;

    }catch(e){
      console.log("\n\n....getLatestSyncedBlock...get synced block failed: ", e);
      this.logUtilSrv.logInfo('getLatestSyncedBlock', 'get  synced block failed...:', e);
      return false;
    }
  }

  async checkConfirmBlockEnd() {
    console.log("\n\n....checkConfirmBlockEnd...this.preSyncedBlockNo: ", this.preSyncedBlockNo);
    // Step 1: check synced block from db
    let rslt = await this.checkCurSyncedBlock();
    if(false === rslt){
      console.log("\n\n....checkConfirmBlockEnd...checkCurSyncedBlock failed!");
      this.logUtilSrv.logInfo('SecurityConfirmTask', 'checkCurSyncedBlock failed...:');
      return false;
    }

    // Step 2: confirmBlockEnd should no more than latestBlockNo-delayBlockNum 
    let maxValidBlockEnd = this.curSyncedBlockNo - this.delayBlockNum;
    this.confirmBlockEnd = this.confirmBlockBegin + this.confirmBlockStep;
    if (this.confirmBlockEnd > maxValidBlockEnd) {
      this.confirmBlockEnd = maxValidBlockEnd;
    }

    console.log("\n\n....checkConfirmBlockEnd...this.preSyncedBlockNo: ", 
    this.confirmBlockBegin, this.confirmBlockEnd, this.preSyncedBlockNo);    
    return true;
  }

  async updateSecurityCheckRecord() {  
    console.log('\n\nupdateSecurityCheckRecord...curSyncedBlockNo:', this.curSyncedBlockNo);  

    // step 1: to check the blockBegin for next round    
    let preMaxValidBlockBeginNo = this.preSyncedBlockNo - this.securityBlockNum;
    let maxValidBlockBeginNo = this.curSyncedBlockNo - this.securityBlockNum;

    if((this.confirmBlockBegin >= preMaxValidBlockBeginNo) 
    || (this.confirmBlockBegin >= maxValidBlockBeginNo)){
      // in this case, confirmBlockBegin no need to change

    } else if (maxValidBlockBeginNo < this.confirmBlockEnd) {
      this.confirmBlockBegin = maxValidBlockBeginNo;

    } else {
      this.confirmBlockBegin = this.confirmBlockEnd;
    }

    console.log('\n\nupdated confirmBlockBegin:  ', this.confirmBlockBegin);

    // step 2: to update the latest security confirm record
    try {

      let option = {
        "chainType": this.chainID
      };

      let ret = await this.confirmDbInst.findByOption(option);
      if (0 === ret.length) {
        let confirmRecordItem = {
          "chainType": this.chainID,
          "confirmBlockBegin": this.confirmBlockBegin,
          "syncedBlockNo": this.curSyncedBlockNo
        };
        await this.confirmDbInst.insert(confirmRecordItem);
        console.log('\n\ninsert security confirm record:  ', confirmRecordItem);

      }else {

        let updation = {
          $set: {
            "confirmBlockBegin": this.confirmBlockBegin,
            "syncedBlockNo": this.curSyncedBlockNo
          }
        };
        await this.confirmDbInst.updateByOption(option, updation);
        console.log('\n\n update security confirm record:  ', updation);
      }

    } catch (e) {
      console.log("\n\n save security confirm record err: ", e);
      this.logUtilSrv.logError('SecurityConfirmService', 'save security confirm record error', e);
      return false;
    }

    this.preSyncedBlockNo = this.curSyncedBlockNo;
    
    return true;
  }

  async handleTxsSecurityCheck() {

    // Step 1: to check the security of treasury tx based on block   
    let ret = await this.processTreasuryRelatedTxCheck();
    if (false === ret) {
      console.log("\n\n...processTreasuryRelatedTxCheck exception!");
      return false;
    }

    // Step 2: to check security of mint tx based on block  
    ret = await this.processMintTxCheck();
    if (false === ret) {
      console.log("\n\n...processMintTxCheck exception!");
      return false;
    }

    console.log("\n\n...handleTxsSecurityCheck finish OK!");
  }

  async fetchBlockInfosByOption(filterOption){
    
    try {      
      let sort = {
        "blockHeight": 1
      };
      let blockInfos = await this.blockInfoDbInst.findAllByOption(filterOption, sort);

      console.log("\n\n...fetchBlockInfosByOption...blockInfos: ", filterOption, blockInfos);
      return blockInfos;

    } catch (e) {
      this.logUtilSrv.logInfo('SecurityConfirmTask', 'fetchBlockInfosByOption...:', e);
      return undefined;
    }

  }

  async processTreasuryRelatedTxCheck() {

    // Step 1: to get blocks which take treasury_related tx
    let blocksOption = {
      "blockTxs.treasury_related": true,
      "blockHeight":  {
        $gte: this.confirmBlockBegin,
        $lt: this.confirmBlockEnd
      }
    };
    let blockInfos = await this.fetchBlockInfosByOption(blocksOption);
    this.logUtilSrv.logInfo('SecurityConfirmTask', 'blocksOption:', blocksOption);
    this.logUtilSrv.logInfo('SecurityConfirmTask', 'fetchBlockInfosByOption:', blockInfos);
    if (undefined === blockInfos) {
      console.log("\n\n....checkConfirmBlockEnd...fetchBlockInfosByOption error: ", blocksOption);
      return false;
    }

    for(let index=0; index<blockInfos.length; index++){
      let blockHash = blockInfos[index].hash;
      let blockHeight = blockInfos[index].blockHeight;
      let blockTxs = blockInfos[index].blockTxs;

      let bCheckFailed = false;
      // to check treasury related tx security
      for (let i = 0; i < blockTxs.length; i++) {
        let txHash = blockTxs[i].tx_hash;

        if (true === blockTxs[i].treasury_related) {
          
          if (true === this.securityConfirmEnable) {

            let checkRslt = await this.securityChecker.confirmTxSecurity(txHash, blockHash, blockHeight);
            console.log("\n\n...SecurityConfirmTask...confirmTxSecurity...checkRslt:", txHash, checkRslt);
            if (false === checkRslt) {
              this.logUtilSrv.logInfo('SecurityConfirmTask', 'tx confirm failed:', txHash);
              blockTxs[i].security_Confirmed = false;
              bCheckFailed = true;
              this.logUtilSrv.logInfo('SecurityConfirmTask', 'tx confirm failed in block:', blockHeight);
              break;
            }
                  
          }

          blockTxs[i].security_Confirmed = true;
        }
      }

      // to update blockInfo db data
      try {
        // take blockHash && blockHash both as filter condition
        let blockFilter = {
          "blockHeight": blockHeight,
          "hash": blockHash
        };
        let blockOption = {
          $set: {
            "blockTxs": blockTxs
          }
        };
        await this.blockInfoDbInst.updateByOption(blockFilter, blockOption);
  
        console.log("\n\n...SecurityConfirmTask...finish block security confirm:", blockFilter, blockOption);
        this.logUtilSrv.logInfo('\n\nSecurityConfirmTask', 'finish block security confirm:', blockFilter);

        if(bCheckFailed){
          this.logUtilSrv.logInfo('SecurityConfirmTask', 'tx confirm failed during process:', blockHeight);
          return false;
        }
          
      } catch (e) {
        this.logUtilSrv.logInfo('SecurityConfirmTask', 'block security confirm failed...:', e);
        return false;
      }
    }
      
    return true;
  }

  async processMintTxCheck() {
    // step 1: to get mint txs based on block scope
    let mapTxId2BlockNo = new Map();
    let uniquedTxIds = new Array();
    
    let mapBlockNum2Infos = new Map();
    let uniqueBlockNos = new Array();
     
    this.logUtilSrv.logInfo('SecurityConfirmTask', 'tokenFilterOption...', this.tokenFilterOption);
    console.log("\n\n\n\n***...SecurityConfirmTask...tokenFilterOption:", this.tokenFilterOption);

    try {
      let mintTxOption = {
        $or: this.tokenFilterOption,
        "blockHeight":  {
          $gte: this.confirmBlockBegin,
          $lt: this.confirmBlockEnd
        }
      };
      let sort = {
        "blockHeight": 1
      };
      let mintTxs = await this.mintInfoDbInst.findAllByOption(mintTxOption, sort);
      console.log("\n\n\n\n***...SecurityConfirmTask...mintTxs:", mintTxOption, mintTxs);
      this.logUtilSrv.logInfo('SecurityConfirmTask', 'mintTxOption...', mintTxOption);
      this.logUtilSrv.logInfo('SecurityConfirmTask', 'mintTxs...', mintTxs);

      // to unique txId && blockHeight
      for (let i = 0; i < mintTxs.length; i++) {
        let txId = mintTxs[i].txId;
        let blockHeight = mintTxs[i].blockHeight;

        // to unique txId list
        if(undefined === mapTxId2BlockNo.get(txId)){
          uniquedTxIds.push(txId);
          mapTxId2BlockNo.set(txId, blockHeight);
        }

        // to unique blockHeight list
        if(undefined === mapBlockNum2Infos.get(blockHeight)){
          uniqueBlockNos.push(blockHeight);
          mapBlockNum2Infos.set(blockHeight, {});
        }
      }

    } catch (e) {
      this.logUtilSrv.logInfo('SecurityConfirmTask', 'get mint tx failed...', e);
      return false;
    }

    this.logUtilSrv.logInfo('SecurityConfirmTask', 'uniqueBlockNos...', uniqueBlockNos);
    if(0 === uniqueBlockNos.length){
      return true;

    }else{
      let blocksOption = {
        "blockHeight": {
          $in: uniqueBlockNos
        }
      };
      // modify: to fetch related section data
      let blockInfos = await this.fetchBlockInfosByOption(blocksOption);
      if (undefined === blockInfos) {
        console.log("\n\n...processMintTxCheck...blockInfos error.");
        return false;
      }

      console.log("\n\n...processMintTxCheck...blockInfos: ", uniqueBlockNos,  blocksOption, blockInfos);
      for(let k=0; k<blockInfos.length; k++){
        mapBlockNum2Infos.set(blockInfos[k].blockHeight, blockInfos[k]);
      }
    }

    this.logUtilSrv.logInfo('SecurityConfirmTask', 'uniquedTxIds...', uniquedTxIds);
    // step 2: to check the security of mint tx 
    for (let j = 0; j < uniquedTxIds.length; j++) {
      let mintTxId = uniquedTxIds[j];
      let blockHeight = mapTxId2BlockNo.get(mintTxId);
      let blockHash = mapBlockNum2Infos.get(blockHeight).hash;

      if (true === this.securityConfirmEnable) {

        let checkRslt = await this.securityChecker.confirmTxSecurity(mintTxId, blockHash, blockHeight);
        console.log("\n\n...SecurityConfirmTask...mint tx...checkRslt:",mintTxId, checkRslt);
        if (false === checkRslt) {
          this.logUtilSrv.logInfo('SecurityConfirmTask', 'mint tx confirm failed:', mintTxId);
          return false;
        }        
      }
    }

    // step 3: to update the security confirm status for mint tx based on block 
    try {
      let mintTxFilter = {
        "txId": {
          $in: uniquedTxIds
        }
      };
      let mintTxOption = {
        $set: {
          "security_Confirmed": true
        }
      };
      await this.mintInfoDbInst.updateManyByOption(mintTxFilter, mintTxOption);
      console.log("\n\n...processMintTxCheck...update mintInfo: ", uniqueBlockNos, mintTxFilter);

    } catch (e) {
      this.logUtilSrv.logInfo('SecurityConfirmTask', 'mint tx security confirm update failed...', e);
      return false;
    }

    this.logUtilSrv.logInfo('SecurityConfirmTask', 'processMintTxCheck...finish' );
    return true;
  }


  // Part 3: schedule task service
  async run() {
    this.logUtilSrv.logDebug("SecurityConfirmTask", "...run begin...", this.chainID);

    // step 1: to check the target block of this round to confirm security
    let checkRet = await this.checkConfirmBlockEnd();
    if (false === checkRet) {
      console.log("\n\n......[SecurityConfirmTask] checkConfirmBlockEnd is failed, try again later!");
      this.logUtilSrv.logError("SecurityConfirmTask", "...checkConfirmBlockEnd is failed, try again later!...");
      this.taskSchedule.setFinishSuccess(this);
      this.addTaskBySelf(this.retryInterval);
      return;
    }

    // Step 2: to check the security of treasury_related txs of the target block
    let handleRet = await this.handleTxsSecurityCheck();
    if (false === handleRet) {
      console.log("\n\n......[SecurityConfirmTask] handleTxsSecurityCheck is exception, try again later!");
      this.logUtilSrv.logError("SecurityConfirmTask", "...handleTxsSecurityCheck takes exception, try again later!...");
      this.taskSchedule.setFinishSuccess(this);
      this.addTaskBySelf(this.retryInterval);
      return;
    }

    // Step 3: to update the security confirmed blockNo in db && mem
    let updateRet = await this.updateSecurityCheckRecord();
    if (false === updateRet) {
      this.logUtilSrv.logError("SecurityConfirmTask", "...save confirmed blockNo failed, try again later!...");
      this.taskSchedule.setFinishSuccess(this);
      this.addTaskBySelf(this.retryInterval);
      return;
    }

    // to set re-loop config
    this.taskSchedule.setFinishSuccess(this);
    this.addTaskBySelf(0);
    this.logUtilSrv.logDebug("SecurityConfirmTask", "...run end...", this.chainID);
    return;
  }

  /**
   *  extended functions
   */
  startTask() {
    this.init();
    this.setPriority('tg');
    this.setNextStartTime(1000);
    this.taskSchedule.addTask(this);
  }

  /**
   *  extended functions
   */
  addTaskBySelf(retryInterval) {
    let that = this;

    // to reset task property
    that.init();
    that.setPriority('tg');
    this.setNextStartTime(retryInterval);
    // to add task into schedule
    this.taskSchedule.addTask(that);
  }

};

module.exports = SecurityConfirmTask;