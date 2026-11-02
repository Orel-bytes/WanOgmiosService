
const BaseTask = require('../taskservice/BaseTask.js');
const ServiceFramework = require("../../framework/ServiceFramework");
const BlockFrostChecker = require("./BlockFrostChecker");
const MaestroChecker = require("./MaestroChecker");
const RecordSecurityHandler = require("./RecordSecurityHandler");


class SecurityConfirmTask extends BaseTask {
  constructor(securityConfirmCfg, tokenFilterOption, mapDbInstance, confirmBlockBegin, preSyncedBlockNo) {
    super();

    // service task config
    this.chainID = "ADA";
    this.serviceID = securityConfirmCfg.securityConfirmServiceID;
    this.retryInterval = securityConfirmCfg.retryInterval;

    // security check config 
    this.securityBlockNum = securityConfirmCfg.securityBlockNum;
    this.delayBlockNum = securityConfirmCfg.delayBlockNum;
    this.confirmBlockStep = securityConfirmCfg.confirmStep;
    this.maxValidBlockMargin = securityConfirmCfg.maxValidBlockMargin;

    this.tokenFilterOption = tokenFilterOption;
    this.mapDbInstance = mapDbInstance;
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

    this.recordSecurityHandler = new RecordSecurityHandler(true,
      this.tokenFilterOption,
      this.mapDbInstance,
      securityConfirmCfg);
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
  async checkCurSyncedBlock() {
    try {
      let filter = {
        "chainType": "ADA"
      };

      let latestBlockPoint = await this.chainSyncDbInst.findByOption(filter);
      if (undefined === latestBlockPoint) {
        console.log("\n\n....getLatestSyncedBlock...get synced block undefined.");
        return false;
      }

      this.curSyncedBlockNo = latestBlockPoint[0].blockHeight;
      return true;

    } catch (e) {
      console.log("\n\n....getLatestSyncedBlock...get synced block failed: ", e);
      this.logUtilSrv.logInfo('getLatestSyncedBlock', 'get  synced block failed...:', e);
      return false;
    }
  }

  async checkConfirmBlockEnd() {
    console.log("\n\n....checkConfirmBlockEnd...this.preSyncedBlockNo: ", this.preSyncedBlockNo);
    // Step 1: check synced block from db
    let rslt = await this.checkCurSyncedBlock();
    if (false === rslt) {
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

    if ((this.confirmBlockBegin >= preMaxValidBlockBeginNo)
      || (this.confirmBlockBegin >= maxValidBlockBeginNo)) {
      // in this case, confirmBlockBegin no need to change

    } else if (maxValidBlockBeginNo < this.confirmBlockEnd) {
      this.confirmBlockBegin = maxValidBlockBeginNo;

    } else {
      this.confirmBlockBegin = this.confirmBlockEnd;
    }

    console.log('\n\nupdated confirmBlockBegin:  ', this.confirmBlockBegin);
    this.preSyncedBlockNo = this.curSyncedBlockNo;

    return true;
  }

  async handleTxsSecurityCheck() {
    // Step 1: to check the security of treasury/nftTreasury tx based on block  
    let blockOption = {
      $or: [{
        "blockTxs.treasury_related": true
      }, {
        "blockTxs.nftTreasury_related": true
      }],
      "blockHeight": {
        $gte: this.confirmBlockBegin,
        $lt: this.confirmBlockEnd
      }
    };
    let sort = {
      "blockHeight": 1
    };
    let ret = await this.recordSecurityHandler.processTreasuryRelatedTxCheck(blockOption, sort);
    if (false === ret.confirmedRslt) {
      console.log("\n\n...processTreasuryRelatedTxCheck exception!");
      return false;
    }

    // Step 2: to check security of mint tx based on block  
    let mintTxOption = {
      $or: this.tokenFilterOption,
      "blockHeight": {
        $gte: this.confirmBlockBegin,
        $lt: this.confirmBlockEnd
      }
    };
    ret = await this.recordSecurityHandler.processMintTxCheck(mintTxOption, sort);
    if (false === ret.confirmedRslt) {
      console.log("\n\n...processMintTxCheck exception!");
      return false;
    }

    console.log("\n\n...handleTxsSecurityCheck finish OK!");
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
    this.addTaskBySelf(10000);
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