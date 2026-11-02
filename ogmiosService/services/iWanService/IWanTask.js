
const BaseTask = require('../taskservice/BaseTask.js');
const ServiceFramework = require("../../framework/ServiceFramework");
const { sleep } = require("../utilService/commonUtils");


class IWanTask extends BaseTask {
  constructor(iWanServiceConfig, iWanClientInst, mapDbInstance, cardanoChainID, bMainnet) {
    super();

    // service task config
    this.chainID = "WAN";
    this.serviceID = iWanServiceConfig.iWanServiceID;
    this.retryInterval = iWanServiceConfig.retryInterval;
    this.iWanClientInst = iWanClientInst;
    this.bMainnet = this.bMainnet;
    this.policyIdDbInst = mapDbInstance.get("mappingTokenPolicyIdConfig");

    this.cardanoChainID = cardanoChainID;

    // module config
    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.storageSrvIns = ServiceFramework.getService("StorageServiceInterface", "StorageService");
    this.taskSchedule = ServiceFramework.getService("TaskServiceInterface", "taskSchedule");
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
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

  async getCardanoNftPolicyIdInfo() {

    let validNftPolicyIds = new Array();
    let mapNftPolicyId = new Map();

    let options = this.bMainnet ? { tags: ["bridge", "bridgeBeta"] } : { isAllTokenPairs: true };
    this.logUtilSrv.logInfo("\n IWanTask...getCardanoNftPolicyIdInfo", "...options: ", options);
    this.logUtilSrv.logInfo("\n IWanTask...getCardanoNftPolicyIdInfo", "...cardanoChainID: ", this.cardanoChainID);

    let tokenPairsInfo = await this.iWanClientInst.getTokenPairs(options);
    // console.log("getCardanoNftPolicyIdInfo ret: ", tokenPairInfo);	
    for (let i = 0; i < tokenPairsInfo.length; i++) {
      let tokenPair = tokenPairsInfo[i];
      this.logUtilSrv.logInfo("\n IWanTask...getCardanoNftPolicyIdInfo", "...tokenPair: ", tokenPair);

      if (this.cardanoChainID !== tokenPair.ancestorChainID) {

        if (this.cardanoChainID === tokenPair.fromChainID) {
          // need to check the real account type in cardano nft tokenpairs
          if ((tokenPair.fromAccountType === 'Erc721')
            || (tokenPair.fromAccountType === 'Erc1155')) {
            // cardanoRelatedTokenPairs.push(tokenPair);
            this.logUtilSrv.logInfo("\n IWanTask...getCardanoNftPolicyIdInfo...useful from account type is : ", tokenPair);

            let nftScAddress = tokenPair.fromAccount;
            let strAssetUnit = Buffer.from(nftScAddress.replace("0x", ""), "hex").toString();
            console.log("cardano related TokenPair fromChain: ", i, tokenPair, strAssetUnit);

            let [strPolicyId, strName] = strAssetUnit.split(".");
            mapNftPolicyId.set(strPolicyId, true);
          }

        } else if (this.cardanoChainID === tokenPair.toChainID) {
          // need to check the real account type in cardano nft tokenpairs
          if ((tokenPair.toAccountType === 'Erc721')
            || (tokenPair.toAccountType === 'Erc1155')) {
            // cardanoRelatedTokenPairs.push(tokenPair);
            this.logUtilSrv.logInfo("\n IWanTask...getCardanoNftPolicyIdInfo...useful to account type is : ", tokenPair);

            let nftScAddress = tokenPair.toAccount;
            let strAssetUnit = Buffer.from(nftScAddress.replace("0x", ""), "hex").toString();
            console.log("cardano related TokenPair toChain: ", i, tokenPair, strAssetUnit);

            let [strPolicyId, strName] = strAssetUnit.split(".");
            mapNftPolicyId.set(strPolicyId, true);
          }
        }

      }
	    /*
      if (this.cardanoChainID === tokenPair.fromChainID) {
        // need to check the real account type in cardano nft tokenpairs
        if ((tokenPair.fromAccountType === 'Erc721')
          || (tokenPair.fromAccountType === 'Erc1155')) {
          this.logUtilSrv.logInfo("\n IWanTask...getCardanoNftPolicyIdInfo","...useful from account type is : ", tokenPair);
          // cardanoRelatedTokenPairs.push(tokenPair);

          let nftScAddress = tokenPair.fromAccount;
          let strAssetUnit = Buffer.from(nftScAddress.replace("0x", ""), "hex").toString();
          console.log("cardano related TokenPair fromChain: ", i, tokenPair, strAssetUnit);

          let [strPolicyId, strName] = strAssetUnit.split(".");
          mapNftPolicyId.set(strPolicyId, true);
        }

      } else if (this.cardanoChainID === tokenPair.toChainID) {
        // need to check the real account type in cardano nft tokenpairs
        if ((tokenPair.toAccountType === 'Erc721')
          || (tokenPair.toAccountType === 'Erc1155')) {
          // cardanoRelatedTokenPairs.push(tokenPair);
          this.logUtilSrv.logInfo("\n IWanTask...getCardanoNftPolicyIdInfo...", "useful to account type is : ", tokenPair);

          let nftScAddress = tokenPair.toAccount;
          let strAssetUnit = Buffer.from(nftScAddress.replace("0x", ""), "hex").toString();
          console.log("cardano related TokenPair toChain: ", i, tokenPair, strAssetUnit);

          let [strPolicyId, strName] = strAssetUnit.split(".");
          mapNftPolicyId.set(strPolicyId, true);
        }
      }*/
    }

    for (let policyId of mapNftPolicyId.keys()) {
      validNftPolicyIds.push(policyId);
    }
    this.logUtilSrv.logInfo("\n IWanTask...getCardanoNftPolicyIdInfo", "...validNftPolicyIds: ", validNftPolicyIds);

    return validNftPolicyIds;
  }

  async getNftTreasuryPolicyIds() {
    try {
      let validNftPolicyIds = await this.getCardanoNftPolicyIdInfo();

      return validNftPolicyIds;

    } catch (err) {
      console.log(err);
      throw ("getNftTreasuryPolicyIds exception: ", err);
    }
  }

  // Part 2: security confirm handle
  async retrieveValidNftPolicyIds() {
    this.logUtilSrv.logInfo("\n IWanTask", "...retrieveValidNftPolicyIds...begin:");
    // this.chainId2TypeInfo
    let nftPolicyIds = undefined;
    try {
      nftPolicyIds = await this.getNftTreasuryPolicyIds();
      this.logUtilSrv.logInfo("\n IWanTask...retrieveValidNftPolicyIds...", "nftPolicyIds info: ", nftPolicyIds);

    } catch (err) {
      console.log(err);
      return false;
    }

    if (undefined !== nftPolicyIds) {
      try {
        let filter = {
          "checkTokenType": 2 // 1: Non-NFT; 2: NFT
        };
        let operation = {
          $set: {
            "policyIds": nftPolicyIds
          }
        };
        await this.policyIdDbInst.updateByOption(filter, operation);
        console.log("\n\n...retrieveValidNftPolicyIds...update mintInfo: ", filter, operation);

      } catch (e) {
        this.logUtilSrv.logInfo('RecordSecurityHandler', 'mint tx security confirm update failed...', e);
        return false;
      }
    }

    console.log('\n\n IWanTask retrieveValidNftPolicyIds end:');
    return true;
  }


  // Part 3: schedule task service
  async run() {
    this.logUtilSrv.logDebug("IWanTask", "...run begin...", this.chainID);

    // step 1: to update valid policyId list of the nft treasury 
    let ret = await this.retrieveValidNftPolicyIds();
    console.log('retrieveValidNftPolicyIds ret:', ret);
    if (false === ret) {
      this.logUtilSrv.logError("IWanTask", "...save confirmed blockNo failed, try again later!...");
      this.taskSchedule.setFinishSuccess(this);
      this.addTaskBySelf(this.retryInterval);
      return;
    }

    await sleep(1800000);

    // to set re-loop config
    this.taskSchedule.setFinishSuccess(this);
    this.addTaskBySelf(1000); // 30*60*1000
    this.logUtilSrv.logDebug("IWanTask", "...run end...", this.chainID);
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

module.exports = IWanTask;
