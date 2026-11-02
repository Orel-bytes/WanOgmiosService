const AgentServiceInterface = require("../../interfaces/AgentServiceInterface");
const ServiceFramework = require("../../framework/ServiceFramework");
const TokenPairsTask = require("./TokenPairsTask");
const ChainUtil = require("./ChainUtils");
const commonUtils = require('../utilService/commonUtils');


const TOKENTYPE_ERC721 = "1";
const TOKENTYPE_ERC1155 = "2";

class IWanService extends AgentServiceInterface {

  /**
   *Creates an instance of IWanService.
   * @memberof IWanService
   */
  constructor() {
    super();

    this.chainID = "WAN";
    this.mapDbInstance = new Map();
    this.mapTokenPairsInfo = new Map();
    this.bInitialOk = false;
  }

  async init() {
    // to scan rp db records and to get the timeout rp
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.storageSrvIns = ServiceFramework.getService("StorageServiceInterface", "StorageService");

    let policyIdSchema = await this.configService.getGlobalConfig("mappingTokenPolicyIdSchema");
    this.policyIdDbInst = await this.storageSrvIns.initDB(policyIdSchema);
    this.mapDbInstance.set(policyIdSchema.name, this.policyIdDbInst);

    this.serviceConfig = await this.configService.getGlobalConfig("iWanConfig");
    this.cardanoChainID = this.serviceConfig.cardanoChainID;
    this.configurationScDict = await this.configService.getGlobalConfig("configurationScDict");

    this.network = await this.configService.getGlobalConfig("network");
    this.bMainnet = ("mainnet" === this.network) ? true : false;

    this.chainUtilInst = new ChainUtil(this.serviceConfig.nodeUrl, this.configurationScDict);
    this.tokenPairsInfo = undefined;

    let ret = await this.configNftPolicyIds();
    if (false === ret) {
      console.log("\n\n insert initial nft policyIdInfo failed! ");
      throw "insert initial nft policyIdInfo failed!"
    }

    this.bInitialOk = true;
    return true;
  }

  getTokenPairById(id){
    let strTokenPairId = commonUtils.number2String(id);
    this.logUtilSrv.logInfo('IWanService', 'getTokenPairById...id:', strTokenPairId);
    this.updateTokenPairsFromTask();
    this.logUtilSrv.logInfo('IWanService', 'updateTokenPairsFromTask...mapTokenPairsInfo:', this.mapTokenPairsInfo);
    let tokenPairInfo = this.mapTokenPairsInfo.get(strTokenPairId);
    this.logUtilSrv.logInfo('IWanService', 'getTokenPairById...ret:', tokenPairInfo);
    return tokenPairInfo;
  }

  updateTokenPairsFromTask(){
    let curTokenPairs = this.tokenPairsTask.getCurTokenPairs();
    this.logUtilSrv.logInfo('IWanService', 'updateTokenPairsFromTask...curTokenPairs:', curTokenPairs);
    if(undefined !== curTokenPairs){
      this.tokenPairsInfo = curTokenPairs;
    }

    for(let i=0; i<this.tokenPairsInfo.length; i++){
      let tokenPairItem = this.tokenPairsInfo[i];
      let tokenPairId = tokenPairItem.id;
      
      this.mapTokenPairsInfo.set(tokenPairId, tokenPairItem);
    }
    this.logUtilSrv.logInfo('IWanService', 'updateTokenPairsFromTask...tokenPairsInfo:', this.tokenPairsInfo);
  }

  async getTokenPairsFromOnChain(){
    try{
      this.tokenPairsInfo = await this.chainUtilInst.getTotalTokenPairsByCrossConfig();

      for(let i=0; i<this.tokenPairsInfo.length; i++){
        let tokenPairItem = this.tokenPairsInfo[i];
        let tokenPairId = tokenPairItem.id;
        
        this.mapTokenPairsInfo.set(tokenPairId, tokenPairItem);
      }
      return this.tokenPairsInfo;

    }catch(error){
      console.log("\n\nIWanService getTotalTokenPairsByCrossConfig takes exception: ", error);
      throw "IWanService getTotalTokenPairsByCrossConfig failed!"
    }
  }

  async getCardanoNftPolicyIdInfo() {
    console.log("\n\n IWanService..getCardanoNftPolicyIdInfo.. begin..");

    let validNftPolicyIds = new Array();
    let mapNftPolicyId = new Map();

    let tokenPairsInfo = await this.getTokenPairsFromOnChain();
    console.log("getCardanoNftPolicyIdInfo ret: ", tokenPairsInfo);
    for (let i = 0; i < tokenPairsInfo.length; i++) {
      let tokenPair = tokenPairsInfo[i];

      if (this.cardanoChainID !== tokenPair.ancestorChainID) {

        if (this.cardanoChainID === tokenPair.fromChainID) {
          // need to check the real account type in cardano nft tokenpairs
          if ((tokenPair.tokenType === TOKENTYPE_ERC721)
            || (tokenPair.tokenType === TOKENTYPE_ERC1155)) {
            // cardanoRelatedTokenPairs.push(tokenPair);
            
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

            let nftScAddress = tokenPair.toAccount;
            let strAssetUnit = Buffer.from(nftScAddress.replace("0x", ""), "hex").toString();
            console.log("cardano related TokenPair toChain: ", i, tokenPair, strAssetUnit);

            let [strPolicyId, strName] = strAssetUnit.split(".");
            mapNftPolicyId.set(strPolicyId, true);
          }
        }

      }
    }

    for (let policyId of mapNftPolicyId.keys()) {
      validNftPolicyIds.push(policyId);
    }

    console.log("\n\n IWanService..getCardanoNftPolicyIdInfo.. end..", validNftPolicyIds);
    return validNftPolicyIds;
  }

  async getNftTreasuryPolicyIds() {
    console.log("\n\n IWanService..getNftTreasuryPolicyIds.. begin..");
    try {

      let validNftPolicyIds = await this.getCardanoNftPolicyIdInfo();
      console.log("\n\n IWanService..getNftTreasuryPolicyIds.. end..", validNftPolicyIds);

      return validNftPolicyIds;

    } catch (err) {
      console.log(err);
      throw ("getNftTreasuryPolicyIds exception: ", err);
    }
  }

  async configNftPolicyIds() {
    console.log('\n\n IWanService.. retrieveValidNftPolicyIds begin:');
    // this.chainId2TypeInfo
    let nftPolicyIds = undefined;
    try {
      nftPolicyIds = await this.getNftTreasuryPolicyIds();
      console.log("IWanService....nftPolicyIds info: ", nftPolicyIds);

    } catch (err) {
      console.log(err);
      return false;
    }

    if (undefined === nftPolicyIds) {
      nftPolicyIds = new Array();
    }

    try {
      let checkTokenType = 2; // 1: Non-NFT; 2: NFT
      let policyIdRecord = await this.policyIdDbInst.findByOption({ "checkTokenType": checkTokenType }, {}, 0);
      if (0 == policyIdRecord.length) {
        // in case there is no any record in table
        let nftPolicyIdsRecord = {
          "checkTokenType": checkTokenType,
          "policyIds": nftPolicyIds
        };
        await this.policyIdDbInst.insert(nftPolicyIdsRecord);

      }else{
        // in case need to update new record
        let filter = {
          "checkTokenType": checkTokenType 
        };
        let operation = {
          $set: {
            "policyIds": nftPolicyIds
          }
        };
        await this.policyIdDbInst.updateByOption(filter, operation);
        console.log("\n\n...retrieveValidNftPolicyIds...update mintInfo: ", filter, operation);
      }

    } catch (e) {
      this.logUtilSrv.logInfo('RecordSecurityHandler', 'insert nft policyIds failed...', e);
      return false;
    }

    return true;
  }

  startUp() {
    console.log("\n\n IWanService startUp: ");
    if (!this.bInitialOk) {
      return false;
    }

    this.tokenPairsTask = new TokenPairsTask(this.serviceConfig, this.chainUtilInst, this.mapDbInstance, this.bMainnet);
    this.tokenPairsTask.startTask();

  }

}

module.exports = IWanService;
