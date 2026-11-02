const ChainSyncServiceInterface = require('../../interfaces/ChainSyncServiceInterface');
const ServiceFramework = require("../../framework/ServiceFramework");
const {
  sleep
} = require("../utilService/commonUtils");
const BftBlockHandler = require("./BftBlockHandler");
const PraosBlockHandler = require("./PraosBlockHandler");
const IndexApiBlockHandler = require("./IndexApiBlockHandler");
const TreasuryUtxoManager = require("./TreasuryUtxoManager");

const IndexApiSyncClient = require("./IndexApiSyncClient.js");

const mapDbNameInst = new Map();
const mapBlockHandler = new Map();

class ChainSyncIndexApiService extends ChainSyncServiceInterface {
  constructor() {
    super();

    this.chainType = "ADA";
    this.mapUtxoManager = new Map();
    console.log("\n\n\n... instance ChainSyncMaestroService...");
  }

  async init() {
    // step 1: to get related service component
    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.storageService = ServiceFramework.getService("StorageServiceInterface", "StorageService");
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
    this.iWanService = ServiceFramework.getService("AgentServiceInterface", "IWanService");

    // this.iWanClientObj = this.iWanService.getIWanClientInstance();

    // step 2: to get related config parameters
    // step: 2-1: to get related db instance
    let blockInfoSchema = await this.configService.getGlobalConfig("blockInfoSchema");
    this.blockInfoDbInst = await this.storageService.initDB(blockInfoSchema);
    mapDbNameInst.set(blockInfoSchema.name, this.blockInfoDbInst);

    let syncedDataSchema = await this.configService.getGlobalConfig("chainSyncSchema");
    this.syncedDbInst = await this.storageService.initDB(syncedDataSchema);
    mapDbNameInst.set(syncedDataSchema.name, this.syncedDbInst);

    let txInfoSchema = await this.configService.getGlobalConfig("txInfoSchema");
    this.txInfoDbInst = await this.storageService.initDB(txInfoSchema);
    mapDbNameInst.set(txInfoSchema.name, this.txInfoDbInst);

    let mintInfoSchema = await this.configService.getGlobalConfig("mintInfoSchema");
    this.mintInfoDbInst = await this.storageService.initDB(mintInfoSchema);
    mapDbNameInst.set(mintInfoSchema.name, this.mintInfoDbInst);

    let treasuryUtxoInfoSchema = await this.configService.getGlobalConfig("treasuryUtxoInfoSchema");
    this.treasuryUtxoDbInst = await this.storageService.initDB(treasuryUtxoInfoSchema);
    mapDbNameInst.set(treasuryUtxoInfoSchema.name, this.treasuryUtxoDbInst);

    let balancedCfgInfoSchema = await this.configService.getGlobalConfig("balancedCfgInfoSchema");
    this.balancedCfgInfoDbInst = await this.storageService.initDB(balancedCfgInfoSchema);
    mapDbNameInst.set(balancedCfgInfoSchema.name, this.balancedCfgInfoDbInst);

    let mappingTokenPolicyIdSchema = await this.configService.getGlobalConfig("mappingTokenPolicyIdSchema");
    this.tokenPolicyIdCfgDbInst = await this.storageService.getDBIns(mappingTokenPolicyIdSchema.name);
    mapDbNameInst.set(mappingTokenPolicyIdSchema.name, this.tokenPolicyIdCfgDbInst);

    this.securityConfirmEnable = await this.configService.getGlobalConfig("securityConfirmEnable");
    console.log("\n\n...ChainSyncMaestroService init...securityConfirmEnable : ", this.securityConfirmEnable);

    this.safeBlockCount = await this.configService.getGlobalConfig("safeBlockCount");

    // to initial treasury utxo manager instance TreasuryCfg
    let treasuryScCfg = await this.configService.getGlobalConfig("treasuryScCfg");
    let nftTreasuryScCfg = await this.configService.getGlobalConfig("nftTreasuryScCfg");
    let checkTokenPolicyIdCfg = await this.configService.getGlobalConfig("checkTokenPolicyIdCfg");
    let nftCheckTokenPolicyIdCfg = await this.configService.getGlobalConfig("nftCheckTokenPolicyIdCfg");
    console.log("\n\n...ChainSyncMaestroService init...step 2-1 : ");

    // to instance a utxo manager for treasury contract
    this.treasuryUtxoMgrObj = new TreasuryUtxoManager(treasuryScCfg, mapDbNameInst, checkTokenPolicyIdCfg);
    let initRet = await this.treasuryUtxoMgrObj.init();
    if (!initRet) {
      throw "treasuryUtxoManager init failed!"
    }
    this.mapUtxoManager.set("NonNFT", this.treasuryUtxoMgrObj);
    await sleep(5 * 1000);

    //  instance a utxo mananger for nftTreasury contract
    this.nftTreasuryUtxoMgrObj = new TreasuryUtxoManager(nftTreasuryScCfg, mapDbNameInst, nftCheckTokenPolicyIdCfg);
    initRet = await this.nftTreasuryUtxoMgrObj.init();
    if (!initRet) {
      throw "nftTreasuryUtxoManager init failed!"
    }
    this.mapUtxoManager.set("NFT", this.nftTreasuryUtxoMgrObj);
    await sleep(5 * 1000);

    // register block hander
    let mapServiceConfig = new Map();
    let msgTokenPolicyIdCfg = await this.configService.getGlobalConfig("msgTokenPolicyIdCfg");
    mapServiceConfig.set("msgTokenPolicyIdCfg", msgTokenPolicyIdCfg);
    let tokenPolicyIdCfg = await this.configService.getGlobalConfig("tokenPolicyIdCfg");
    mapServiceConfig.set("tokenPolicyIdCfg", tokenPolicyIdCfg);
    let securityConfirmCfg = await this.configService.getConfig("AgentServiceInterface", "AgentService", "SecurityConfirmCfg");
    mapServiceConfig.set("blockFrostConfig", securityConfirmCfg.blockFrostConfig);
    let txMetaDataSource = await this.configService.getGlobalConfig("txMetaDataSource");
    mapServiceConfig.set("txMetaDataSource", txMetaDataSource);
    let chainAddressPrefixConfig = await this.configService.getGlobalConfig("chainAddressPrefixConfig");
    mapServiceConfig.set("chainAddressPrefixConfig", chainAddressPrefixConfig);

    this.indexApiBlockHandler = new IndexApiBlockHandler(this.mapUtxoManager, this.securityConfirmEnable, this.iWanService, mapServiceConfig, this.logUtilSrv);
    mapBlockHandler.set("IndexApiBlockType", this.indexApiBlockHandler);

    let indexApiCfg = await this.configService.getGlobalConfig("indexApiCfg");
    this.indexApiSyncClient = new IndexApiSyncClient(indexApiCfg, this.logUtilSrv);

    // step: 2-2: to get synced block number
    this.chainSyncServiceCfg = await this.configService.getGlobalConfig("chainSyncCfg");
    let syncedRecord = await this.syncedDbInst.findByOption({ "chainType": this.chainType }, {}, 0);

    if (0 == syncedRecord.length) {

      let initialBlockTs = new Date(this.chainSyncServiceCfg.initialBlockTime).getTime() / 1000;
      console.log("initialBlockTs: ", initialBlockTs, this.chainSyncServiceCfg.initialBlockTime);
      this.chainSyncedInfo = {
        "syncedBlockNumber": this.chainSyncServiceCfg.initialBlockNumber,
        "syncedBlockTime": initialBlockTs,
        "syncedSlot": this.chainSyncServiceCfg.initialSlot,
        "syncedHash": this.chainSyncServiceCfg.initialHash
      }
      // console.log("\n\n this.chainSyncedInfo: " + this.chainSyncedInfo);
      let syncedData = {
        "chainType": "ADA",
        "blockHeight": this.chainSyncedInfo.syncedBlockNumber,
        "time": this.chainSyncedInfo.syncedBlockTime,
        "slot": this.chainSyncedInfo.syncedSlot,
        "hash": this.chainSyncedInfo.syncedHash
      }
      console.log("syncedData: ", syncedData);
      try {
        await this.syncedDbInst.insert(syncedData);

      } catch (error) {
        console.log("\n\n insert syncedData failed: ", error);
        throw "insert syncedData failed!"
      }


      //// to insert initial balanced config
      this.balancedCfg = await this.configService.getGlobalConfig("balancedCfg");
      let balancedCfgData = {
        "chainType": "ADA",
        "utxoNumThresheld": this.balancedCfg.utxoNumThresheld,
        "assetAmountThresheld": this.balancedCfg.assetAmountThresheld
      }
      console.log("balancedCfgData: ", balancedCfgData);
      try {
        await this.balancedCfgInfoDbInst.insert(balancedCfgData);

      } catch (error) {
        console.log("\n\n insert initial balancedCfgData failed: ", error);
        throw "insert initial balancedCfgData failed!"
      }

    } else {
      this.chainSyncedInfo = {
        "syncedBlockNumber": syncedRecord[0].blockHeight,
        "syncedBlockTime": syncedRecord[0].time,
        "syncedSlot": syncedRecord[0].slot,
        "syncedHash": syncedRecord[0].hash
      }
    }
  }

  fetchInitSyncedInfo() {

    return this.chainSyncedInfo;
  }

  async startUp() {
    this.syncByIndexApi();
  }

  async syncByIndexApi() {
    let chainSyncInterval = await this.configService.getGlobalConfig("chainSyncInterval");
    while (true) {
      try {
        let lastBlock = await this.indexApiSyncClient.get_block();
        if (undefined === lastBlock) {
          console.log("syncByIndexApi...get_block...", lastBlock);
          await sleep(100);
          continue;
        }
        this.logUtilSrv.logInfo("getNextSyncBlockNumber", "...syncByIndexApi lastBlock...", lastBlock);
        let nextSyncBlockNumber = await this.getNextSyncBlockNumber(lastBlock);
        this.logUtilSrv.logInfo("getNextSyncBlockNumber", "...syncByIndexApi lastBlock ok...", lastBlock);
        console.log("nextSyncBlockNumber:", nextSyncBlockNumber);
        if (nextSyncBlockNumber === 0) {
          await sleep(chainSyncInterval);
          continue;
        }

        await this.scan_block_batch(nextSyncBlockNumber, lastBlock);
        // await this.scan_block_no_batch(nextSyncBlockNumber, lastBlock);
      } catch (err) {
        console.log("syncByIndexApi err:", err);
        this.logUtilSrv.logInfo("getNextSyncBlockNumber", "...syncByIndexApi error:", err);
      }
      await sleep(chainSyncInterval);
    }
  }

  async scan_block_no_batch(nextSyncBlockNumber, lastBlock) {
    // 扫链
    for (let blockNumber = nextSyncBlockNumber; blockNumber <= lastBlock.height; ++blockNumber) {
      let curBlock = await this.indexApiSyncClient.get_block(blockNumber);
      curBlock.slot = curBlock.absolute_slot;
      curBlock.id = curBlock.hash;
      curBlock.transactions = [];

      if (curBlock.tx_hashes.length > 0) {
        curBlock.transactions = await this.scan_block(curBlock.absolute_slot, curBlock.absolute_slot);
      }

      let indexApiBlockHandler = mapBlockHandler.get("IndexApiBlockType");
      await indexApiBlockHandler.processBlock(curBlock, mapDbNameInst, curBlock.transactions);

      await this.updateSyncedInfo();

      console.log("scanBlockOneByOne update syncedBlockNumber:", blockNumber);

      await sleep(1000);
    }
  }

  async scan_block(begin_slot, end_slot) {
    console.log("\n\n...scan_block: ", begin_slot, end_slot);
    let treasuryScCfg = await this.configService.getGlobalConfig("treasuryScCfg");
    let txs = await this.scan_block_scAddress(treasuryScCfg, begin_slot, end_slot);

    let policyIds = await this.configService.getGlobalConfig("tokenPolicyIdCfg");
    for (let j = 0; j < policyIds.length; j++) {
      let policy_txs = await this.scan_block_policy(policyIds[j], begin_slot, end_slot);
      txs = txs.concat(policy_txs);
    }

    // add msg tx 
    let msgTokenPolicyIds = await this.configService.getGlobalConfig("msgTokenPolicyIdCfg");
    for (let i = 0; i < msgTokenPolicyIds.length; i++) {
      let msg_txs = await this.scan_block_policy(msgTokenPolicyIds[i], begin_slot, end_slot);
      txs = txs.concat(msg_txs);
    }

    let bEnableNFT = false;
    if (bEnableNFT) {
      let nftTreasuryScCfg = await this.configService.getGlobalConfig("nftTreasuryScCfg");
      let nftTxs = await this.scan_block_scAddress(nftTreasuryScCfg, begin_slot, end_slot);
      txs = txs.concat(nftTxs);

      let nftPolicyIds = await indexApiBlockHandler.getMintNFTPolicyId(mapDbNameInst);
      for (let i = 0; i < nftPolicyIds.length; i++) {
        let nftPolicyId_txs = await this.scan_block_policy(nftPolicyIds[i], begin_slot, end_slot);
        txs = txs.concat(nftPolicyId_txs);
      }
    }

    return txs;
  }

  async scan_block_scAddress(scAddr, begin_slot, end_slot) {
    let txsRet = [];
    console.log("\n\n...scan_block_scAddress: ", begin_slot, end_slot);
    let txs = await this.indexApiSyncClient.query_txs_by_address(scAddr, begin_slot, end_slot);
    console.log("\n\n...scan_block_scAddress txs: ", txs);
    for (let idx = 0; idx < txs.length; ++idx) {
      let tx = txs[idx];
      let txInfo = await this.indexApiSyncClient.query_txinfo_by_hash(tx.tx_hash);
      txsRet.push(txInfo);
    }
    return txsRet;
  }

  async scan_block_policy(policyId, begin_slot, end_slot) {
    let txsRet = [];
    let txs = await this.indexApiSyncClient.query_txs_by_policy(policyId, begin_slot, end_slot);
    for (let idx = 0; idx < txs.length; ++idx) {
      let tx = txs[idx];
      let txInfo = await this.indexApiSyncClient.query_txinfo_by_hash(tx.tx_hash);
      txsRet.push(txInfo);
    }
    return txsRet;
  }

  async getNextSyncBlockNumber(lastBlock) {
    let nextSyncBlockNumber = undefined;
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");

    // step 1: to check if need to sync data from the initial block
    if (this.chainSyncServiceCfg.initialBlockNumber === this.chainSyncedInfo.syncedBlockNumber) {
      nextSyncBlockNumber = this.chainSyncedInfo.syncedBlockNumber + 1;
      await this.deleteReScanBlockData(nextSyncBlockNumber);
      return nextSyncBlockNumber;
    }

    // step 2: to check if takes rollback blocks and find out the next block to sync
    let maxSafeBlockHeight = this.chainSyncedInfo.syncedBlockNumber - this.safeBlockCount;
    for (let i = this.chainSyncedInfo.syncedBlockNumber; i >= maxSafeBlockHeight;) {
      console.log("getNextSyncBlockNumber...block data on chain:", i);
      const blockDataOnChain = await this.indexApiSyncClient.get_block(i);
      console.log("getNextSyncBlockNumber...block data from on chain:", blockDataOnChain);
      if (undefined === blockDataOnChain) {
        this.logUtilSrv.logInfo("getNextSyncBlockNumber", "exception for getting block data from on chain:", i);
        await sleep(1000);
        continue;
      }

      const blockDataInDB = await blockInfoDbObj.findByOption({ blockHeight: i });
      console.log("getNextSyncBlockNumber...block data from on chain:", blockDataInDB);
      if ((undefined === blockDataInDB) || (0 === blockDataInDB.length)) {
        this.logUtilSrv.logInfo("getNextSyncBlockNumber", "exception for no block record in db:", i);
        return undefined;
      }

      if (blockDataInDB[0].hash === blockDataOnChain.hash) {
        nextSyncBlockNumber = i + 1;
        break;
      }

      i--;
    }

    if (undefined === nextSyncBlockNumber) {
      return undefined;
    }

    if (nextSyncBlockNumber !== (this.chainSyncedInfo.syncedBlockNumber + 1)) {
      // step 3 to update chainsyncinfos record
      let ret = await blockInfoDbObj.findByOption({ blockHeight: nextSyncBlockNumber - 1 });
      let syncedBlock = ret[0];
      syncedBlock.height = syncedBlock.blockHeight;
      syncedBlock.id = syncedBlock.blockHash;
      let indexApiBlockHandler = mapBlockHandler.get("IndexApiBlockType");
      await indexApiBlockHandler.updateSyncedInfo(syncedBlock, syncedBlock.time, mapDbNameInst);
    }

    // step 4: to delete invalid records
    await this.deleteReScanBlockData(nextSyncBlockNumber);
    return nextSyncBlockNumber;
  }

  async updateSyncedInfo() {
    let syncedRecord = await this.syncedDbInst.findByOption({ "chainType": this.chainType }, {}, 0);
    if (syncedRecord.length > 0) {
      this.chainSyncedInfo = {
        "syncedBlockNumber": syncedRecord[0].blockHeight,
        "syncedBlockTime": syncedRecord[0].time,
        "syncedSlot": syncedRecord[0].slot,
        "syncedHash": syncedRecord[0].hash
      };

    }
  }

  async deleteReScanBlockData(nextSyncBlockNumber) {
    // to delete the block data which has been rollback
    let blockFilter = {
      "blockHeight": { '$gte': nextSyncBlockNumber }
    }

    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");
    let mintInfoDbObj = mapDbNameInst.get("mintInfo");
    let treasuryInfoDbObj = mapDbNameInst.get("treasuryUtxoInfo");

    await blockInfoDbObj.deleteByOption(blockFilter);
    await txInfoDbObj.deleteByOption(blockFilter);
    await mintInfoDbObj.deleteByOption(blockFilter);
    await treasuryInfoDbObj.deleteByOption(blockFilter);
  }

  async scan_block_batch(nextSyncBlockNumber, lastBlock) {
    let batchScanCount = await this.configService.getGlobalConfig("batchScanCount");
    while (nextSyncBlockNumber <= lastBlock.height) {
      let block_map = new Map();
      let begin_slot, end_slot;

      this.logUtilSrv.logInfo("scan_block_batch", "...get_block...from", nextSyncBlockNumber);
      for (let idx = 0; idx < batchScanCount; ++idx) {
        this.logUtilSrv.logInfo("scan_block_batch", "...get_block...at: ", nextSyncBlockNumber);
        let curBlock = await this.indexApiSyncClient.get_block(nextSyncBlockNumber);
        this.logUtilSrv.logInfo("scan_block_batch", "...get_block...ok: ", nextSyncBlockNumber);
        curBlock.slot = curBlock.absolute_slot;
        curBlock.id = curBlock.hash;
        curBlock.transactions = [];

        if (idx === 0) {
          begin_slot = curBlock.slot;
        }
        end_slot = curBlock.slot;
        block_map.set(curBlock.height, curBlock);

        ++nextSyncBlockNumber;
        if (nextSyncBlockNumber === lastBlock.height + 1) {
          console.log("\n\n...scan_block_batch inner for: ", begin_slot, end_slot);
          await sleep(500);
          break;
        }
      }

      this.logUtilSrv.logInfo("scan_block_batch", "...get_block_tx...at", nextSyncBlockNumber);
      console.log("\n\n...scan_block_batch: ", begin_slot, end_slot);
      let txs = await this.scan_block(begin_slot, end_slot);
      for (let idx = 0; idx < txs.length; ++idx) {
        let tx = txs[idx];
        let block = block_map.get(tx.block_height);
        block.transactions.push(tx);
      }
      this.logUtilSrv.logInfo("scan_block_batch", "...get_block_tx...ok", nextSyncBlockNumber);

      //console.log("\n\n");
      for (let [blockNumber, curBlock] of block_map) {
        let indexApiBlockHandler = mapBlockHandler.get("IndexApiBlockType");
        await indexApiBlockHandler.processBlock(curBlock, mapDbNameInst, curBlock.transactions);
        await this.updateSyncedInfo();
        //console.log("scan_block_batch update syncedBlockNumber:", blockNumber);
      }
      this.logUtilSrv.logInfo("scan_block_batch", "...get_block...update db ok", nextSyncBlockNumber);

      await sleep(500);
    }
  }
}

module.exports = ChainSyncIndexApiService;

