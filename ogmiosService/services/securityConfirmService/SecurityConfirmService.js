const AgentServiceInterface = require("../../interfaces/AgentServiceInterface");
const ServiceFramework = require("../../framework/ServiceFramework");
const SecurityConfirmTask = require("./SecurityConfirmTask");
const RecordSecurityHandler = require("./RecordSecurityHandler");


class SecurityConfirmService extends AgentServiceInterface {

  /**
   *Creates an instance of SecurityConfirmService.
   * @memberof SecurityConfirmService
   */
  constructor() {
    super();

    this.chainID = "ADA";
    this.mapDbInstance = new Map();
    this.bInitialOk = false;
  }

  async init() {
    // to scan rp db records and to get the timeout rp
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.storageSrvIns = ServiceFramework.getService("StorageServiceInterface", "StorageService");
    this.chainSyncSrvIns = ServiceFramework.getService("EndPointServiceInterface", "ChainSyncService");

    this.securityConfirmCfg = await this.configService.getConfig("AgentServiceInterface", "AgentService", "SecurityConfirmCfg");
    this.securityBlockNum = this.securityConfirmCfg.securityBlockNum;

    // to initial related module
    let securityConfirmSchema = await this.configService.getGlobalConfig("securityConfirmedInfoSchema");
    this.securityConfirmDbInst = await this.storageSrvIns.initDB(securityConfirmSchema);
    this.mapDbInstance.set("confirmedRecord", this.securityConfirmDbInst);

    let chainSyncSchema = await this.configService.getGlobalConfig("chainSyncSchema");
    this.chainSyncDbInst = await this.storageSrvIns.getDBIns(chainSyncSchema.name);
    this.mapDbInstance.set("syncedRecord", this.chainSyncDbInst);

    let blockInfoSchema = await this.configService.getGlobalConfig("blockInfoSchema");
    this.blockInfoDbInst = await this.storageSrvIns.getDBIns(blockInfoSchema.name);
    this.mapDbInstance.set("blockRecord", this.blockInfoDbInst);

    let mintInfoSchema = await this.configService.getGlobalConfig("mintInfoSchema");
    this.mintInfoDbInst = await this.storageSrvIns.getDBIns(mintInfoSchema.name);
    this.mapDbInstance.set("mintRecord", this.mintInfoDbInst);

    let ret = await this.initCheckTokenCfg();
    if (false === ret) {
      return false;
    }

    ret = await this.initConfirmBlockBegin();
    if (false === ret) {
      return false;
    }

    this.securityConfirmEnable = await this.configService.getGlobalConfig("securityConfirmEnable");
    this.recordSecurityHandler = new RecordSecurityHandler(this.securityConfirmEnable,
      this.checkTokenRegexOption,
      this.mapDbInstance,
      this.securityConfirmCfg);

    this.bInitialOk = true;
    return true;
  }

  async initCheckTokenCfg() {
    this.checkTokenRegexOption = new Array();

    // to init treasury check token policyId
    let checkTokenPolicyIdCfg = await this.configService.getGlobalConfig("checkTokenPolicyIdCfg");
    if (undefined === checkTokenPolicyIdCfg) {
      return false;
    }

    for (let i = 0; i < checkTokenPolicyIdCfg.length; i++) {
      let tmpRegex = eval("/^" + checkTokenPolicyIdCfg[i] + './');
      let tokenRegexItem = {
        "tokenId": { $regex: tmpRegex }
      }
      this.checkTokenRegexOption.push(tokenRegexItem);
    }

    // to init nft-treasury check token policyId
    let nftCheckTokenPolicyIdCfg = await this.configService.getGlobalConfig("nftCheckTokenPolicyIdCfg");
    if (undefined === nftCheckTokenPolicyIdCfg) {
      return false;
    }

    for (let j = 0; j < nftCheckTokenPolicyIdCfg.length; j++) {
      let tmpRegex = eval("/^" + nftCheckTokenPolicyIdCfg[j] + './');
      let tokenRegexItem = {
        "tokenId": { $regex: tmpRegex }
      }
      this.checkTokenRegexOption.push(tokenRegexItem);
    }

    return true;
  }


  async initConfirmBlockBegin() {

    let bRet1 = await this.fetchSyncedBlock();
    if (false === bRet1) {
      return false;
    }

    let bRet2 = await this.fetchUnconfirmBlock();
    if (false === bRet2) {
      return false;
    }

    this.confirmBlockBegin = this.syncedBlockNo - this.securityBlockNum;
    if ((undefined !== this.targetBlockInfo)
      && (this.targetBlockInfo.blockHeight < this.confirmBlockBegin)) {
      this.confirmBlockBegin = this.targetBlockInfo.blockHeight;
    }
    console.log("\n\n...security confirm record: ", this.confirmBlockBegin, this.syncedBlockNo);
  }

  async fetchUnconfirmBlock() {

    // to get the latest confirme record
    try {

      let blocksOption = {
          $or: [{
            "blockTxs": {
              $elemMatch: {
                "treasury_related": true,
                "security_Confirmed": false
              }
            }
          }, {
            "blockTxs": {
              $elemMatch: {
                "nftTreasury_related": true,
                "security_Confirmed": false
              }
            }
          }]
      };
      let sort = {
        "blockHeight": 1
      };
      let limit = 1;
      let blockInfos = await this.blockInfoDbInst.findByOption(blocksOption, sort, limit);
      console.log("\n\n...get block info: ", blockInfos);
      if (undefined === blockInfos) {
        return false;
      }

      this.targetBlockInfo = blockInfos[0];

    } catch (err) {
      this.logUtilSrv.logInfo('SecurityConfirmService', 'fetch security confirm record err: ', err);
      return false;
    }

    return true;
  }

  async fetchSyncedBlock() {
    // this.chainSyncedInfo = {
    //   "syncedBlockNumber": syncedRecord[0].blockHeight,
    //   "syncedBlockTime": syncedRecord[0].time,
    //   "syncedSlot": syncedRecord[0].slot,
    //   "syncedHash": syncedRecord[0].hash
    // }
    // to fetch the synced blockNo of which before chain sync service start up
    let syncSrvInitInfo = this.chainSyncSrvIns.fetchInitSyncedInfo();
    console.log("\n\n....fetchInitSyncedInfo...syncSrvInitInfo: ", syncSrvInitInfo);
    if (undefined === syncSrvInitInfo) {
      return false;
    }
    this.syncedBlockNo = syncSrvInitInfo.syncedBlockNumber;

    // to fetch the latest synced blockNo of which has been synced at this moment
    try {
      let filter = {
        "chainType": "ADA"
      };
      let latestBlockPoint = await this.chainSyncDbInst.findByOption(filter);
      console.log("\n\n....getLatestSyncedBlock...get latestBlockPoint: ", latestBlockPoint);
      if (undefined === latestBlockPoint) {
        return false;
      }

      if (latestBlockPoint[0].blockHeight < this.syncedBlockNo) {
        this.syncedBlockNo = latestBlockPoint[0].blockHeight;
      }
      console.log("\n\n....fetchSyncedBlock...syncedBlockNo: ", this.syncedBlockNo);

    } catch (e) {
      console.log("\n\n....getLatestSyncedBlock...get synced block failed: ", e);
      this.logUtilSrv.logInfo('getLatestSyncedBlock', 'get  synced block failed...:', e);
      return false;
    }

    return true;
  }

  async migrateUnconfirmRecord() {
    // to migrate treasury related tx security confirm
    do {

      try {
        let blocksOption = {
          $or: [{
            "blockTxs": {
              $elemMatch: {
                "treasury_related": true,
                "security_Confirmed": false
              }
            }
          }, {
            "blockTxs": {
              $elemMatch: {
                "nftTreasury_related": true,
                "security_Confirmed": false
              }
            }
          }]
        };
        let sort = {
          "blockHeight": 1
        };
        let limit = 100;
        let ret = await this.recordSecurityHandler.processTreasuryRelatedTxCheck(blocksOption, sort, limit);
        console.log("\n\n...migrateUnconfirmRecord processTreasuryRelatedTx: ", ret);
        if (false === ret.confirmedRslt) {
          return false;
        } else if ((true === ret.confirmedRslt) && (ret.confirmedLen < limit)) {
          break;
        }

      } catch (err) {
        this.logUtilSrv.logInfo('SecurityConfirmService', 'fetch security confirm record err: ', err);
        return false;
      }

    } while (true);

    // to migrate mint tx security confirm
    do {
      try {
        let mintTxOption = {
          $or: this.checkTokenRegexOption,
          "security_Confirmed": false
        };
        let mintTxSort = {
          "blockHeight": 1
        };
        let limit = 100;
        let ret = await this.recordSecurityHandler.processMintTxCheck(mintTxOption, mintTxSort, limit);
        if (false === ret.confirmedRslt) {
          return false;
        } else if ((true === ret.confirmedRslt) && (ret.confirmedLen < limit)) {
          break;
        }

      } catch (err) {
        this.logUtilSrv.logInfo('SecurityConfirmService', 'fetch security confirm record err: ', err);
        return false;
      }

    } while (true);

    return true;
  }

  async confirmUtxoSecurity(address, txId, index) {
    let rslt = await this.recordSecurityHandler.processUtxosAvailableCheck(address, txId, index);

    this.logUtilSrv.logInfo('SecurityConfirmService', 'utxo available check result: ', rslt);
  }

  startUp() {
    console.log("\n\n SecurityConfirmService startUp: ");
    if (!this.bInitialOk) {
      return false;
    }

    if (!this.securityConfirmEnable) {
      this.migrateUnconfirmRecord();

    } else {
      this.txSecurityConfirmTask = new SecurityConfirmTask(this.securityConfirmCfg,
        this.checkTokenRegexOption,
        this.mapDbInstance,
        this.confirmBlockBegin,
        this.syncedBlockNo);

      this.txSecurityConfirmTask.startTask();
    }

  }

}

module.exports = SecurityConfirmService;
