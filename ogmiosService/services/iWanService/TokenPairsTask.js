
const BaseTask = require('../taskservice/BaseTask.js');
const ServiceFramework = require("../../framework/ServiceFramework.js");
const { sleep } = require("../utilService/commonUtils.js");
const ChainUtil = require("./ChainUtils.js");

const TOKENTYPE_ERC721 = "1";
const TOKENTYPE_ERC1155 = "2";

class TokenPairsTask extends BaseTask {
  constructor(taskConfig, chainUtilInst, mapDbInstance, bMainnet) {
    super();

    // service task config
    this.chainID = "WAN";
    this.serviceID = taskConfig.serviceID;
    this.retryInterval = taskConfig.retryInterval;
    this.cardanoChainID = taskConfig.cardanoChainID;
    this.chainUtilInst = chainUtilInst;
    this.bMainnet = bMainnet;
    
    this.policyIdDbInst = mapDbInstance.get("mappingTokenPolicyIdConfig");

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

  getCurTokenPairs(){
    return this.tokenPairsInfo;
  }

  async getTokenPairsFromOnChain(){

    try{
      this.tokenPairsInfo = await this.chainUtilInst.getTotalTokenPairsByCrossConfig();

    }catch(error){
      console.log("\n\nTokenPairsTask getTotalTokenPairsByCrossConfig takes exception: ", error);
      throw "TokenPairsTask getTotalTokenPairsByCrossConfig failed!"
    }

    return this.tokenPairsInfo;
  }

  async getCardanoNftPolicyIdInfo() {

    let validNftPolicyIds = new Array();
    let mapNftPolicyId = new Map();

    let tokenPairsInfo = await this.getTokenPairsFromOnChain();
    this.logUtilSrv.logInfo("\n TokenPairsTask...getCardanoNftPolicyIdInfo", "...getTokenPairsFromOnChain...len: ", tokenPairsInfo.length);
    // console.log("getCardanoNftPolicyIdInfo ret: ", tokenPairInfo);	
    for (let i = 0; i < tokenPairsInfo.length; i++) {
      let tokenPair = tokenPairsInfo[i];
      // this.logUtilSrv.logInfo("\n TokenPairsTask...getCardanoNftPolicyIdInfo", "...tokenPair: ", tokenPair);

      if (this.cardanoChainID !== tokenPair.ancestorChainID) {

        if (this.cardanoChainID === tokenPair.fromChainID) {
          // need to check the real account type in cardano nft tokenpairs
          if ((tokenPair.tokenType === TOKENTYPE_ERC721)
            || (tokenPair.tokenType === TOKENTYPE_ERC1155)) {
            // cardanoRelatedTokenPairs.push(tokenPair);
            this.logUtilSrv.logInfo("\n TokenPairsTask...getCardanoNftPolicyIdInfo...useful from account type is : ", tokenPair);

            let nftScAddress = tokenPair.fromAccount;
            let strAssetUnit = Buffer.from(nftScAddress.replace("0x", ""), "hex").toString();
            console.log("cardano related TokenPair fromChain: ", i, tokenPair, strAssetUnit);

            let [strPolicyId, strName] = strAssetUnit.split(".");
            mapNftPolicyId.set(strPolicyId, true);
          }

        } else if (this.cardanoChainID === tokenPair.toChainID) {
          // need to check the real account type in cardano nft tokenpairs
          if ((tokenPair.tokenType === TOKENTYPE_ERC721)
            || (tokenPair.tokenType === TOKENTYPE_ERC1155)) {
            // cardanoRelatedTokenPairs.push(tokenPair);
            this.logUtilSrv.logInfo("\n TokenPairsTask...getCardanoNftPolicyIdInfo...useful to account type is : ", tokenPair);

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
          this.logUtilSrv.logInfo("\n TokenPairsTask...getCardanoNftPolicyIdInfo","...useful from account type is : ", tokenPair);
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
          this.logUtilSrv.logInfo("\n TokenPairsTask...getCardanoNftPolicyIdInfo...", "useful to account type is : ", tokenPair);

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
    this.logUtilSrv.logInfo("\n TokenPairsTask...getCardanoNftPolicyIdInfo", "...validNftPolicyIds: ", validNftPolicyIds);

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
    this.logUtilSrv.logInfo("\n TokenPairsTask", "...retrieveValidNftPolicyIds...begin:");
    // this.chainId2TypeInfo
    let nftPolicyIds = undefined;
    try {
      nftPolicyIds = await this.getNftTreasuryPolicyIds();
      this.logUtilSrv.logInfo("\n TokenPairsTask...retrieveValidNftPolicyIds...", "nftPolicyIds info: ", nftPolicyIds);

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

    console.log('\n\n TokenPairsTask retrieveValidNftPolicyIds end:');
    return true;
  }


  // Part 3: schedule task service
  async run() {
    this.logUtilSrv.logDebug("TokenPairsTask", "...run begin...", this.chainID);

    // step 1: to update valid policyId list of the nft treasury 
    let ret = await this.retrieveValidNftPolicyIds();
    console.log('retrieveValidNftPolicyIds ret:', ret);
    if (false === ret) {
      this.logUtilSrv.logError("TokenPairsTask", "...save confirmed blockNo failed, try again later!...");
      this.taskSchedule.setFinishSuccess(this);
      this.addTaskBySelf(this.retryInterval);
      return;
    }

    await sleep(1800000);

    // to set re-loop config
    this.taskSchedule.setFinishSuccess(this);
    this.addTaskBySelf(1000); // 30*60*1000
    this.logUtilSrv.logDebug("TokenPairsTask", "...run end...", this.chainID);
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

module.exports = TokenPairsTask;
