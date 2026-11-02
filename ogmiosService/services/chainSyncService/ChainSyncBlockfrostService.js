const ChainSyncServiceInterface = require('../../interfaces/ChainSyncServiceInterface');
const ServiceFramework = require("../../framework/ServiceFramework");
const {
  sleep
} = require("../utilService/commonUtils");

const TreasuryUtxoManager = require("./TreasuryUtxoManager");
const BlockfrostBlockHandler = require("./BlockfrostBlockHandler");
const BlockfrostSyncClient = require("./BlockfrostSyncClient.js");

const mapDbNameInst = new Map();
const mapBlockHandler = new Map();

class ChainSyncBlockfrostService extends ChainSyncServiceInterface {
  constructor() {
    super();

    this.chainType = "ADA";
    this.mapUtxoManager = new Map();
    console.log("\n\n\n... instance ChainSyncBlockfrostService...");
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
    console.log("\n\n...ChainSyncBlockfrostService init...securityConfirmEnable : ", this.securityConfirmEnable);

    this.safeBlockCount = await this.configService.getGlobalConfig("safeBlockCount");

    // to initial treasury utxo manager instance TreasuryCfg
    let treasuryScCfg = await this.configService.getGlobalConfig("treasuryScCfg");
    let nftTreasuryScCfg = await this.configService.getGlobalConfig("nftTreasuryScCfg");
    let checkTokenPolicyIdCfg = await this.configService.getGlobalConfig("checkTokenPolicyIdCfg");
    let nftCheckTokenPolicyIdCfg = await this.configService.getGlobalConfig("nftCheckTokenPolicyIdCfg");
    console.log("\n\n...ChainSyncBlockfrostService init...step 2-1 : ");

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

    this.blockfrostSyncClient = new BlockfrostSyncClient(securityConfirmCfg.blockFrostConfig.ApiKey, this.logUtilSrv);
    this.blockfrostBlockHandler = new BlockfrostBlockHandler(this.mapUtxoManager, this.securityConfirmEnable, this.iWanService, mapServiceConfig, this.logUtilSrv, this.blockfrostSyncClient);
    mapBlockHandler.set("BlockfrostBlockType", this.blockfrostBlockHandler);


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
    this.syncByBlockfrost();
  }

  async syncByBlockfrost() {
    let chainSyncInterval = await this.configService.getGlobalConfig("chainSyncInterval");
    console.log("syncByBlockfrost begin");
    this.logUtilSrv.logInfo("ChainSyncBlockfrostService", "...syncByBlockfrost...", "begin");

    while (true) {
      try {
        let lastBlock = await this.blockfrostSyncClient.get_block();
        console.log("syncByBlockfrost 1 lastBlock:", lastBlock);
        if (undefined === lastBlock) {
          console.log("syncByBlockfrost...get_block...", lastBlock);
          await sleep(100);
          continue;
        }

        this.logUtilSrv.logInfo("ChainSyncBlockfrostService", "...syncByBlockfrost lastBlock...", lastBlock);
        let nextSyncBlockNumber = await this.getNextSyncBlockNumber(lastBlock);
        console.log("nextSyncBlockNumber:", nextSyncBlockNumber);
        if (undefined === nextSyncBlockNumber) {
          throw "There takes exception during confirming nextSyncBlockNumber!!"
        }

        await this.scan_block_batch(nextSyncBlockNumber, lastBlock);
      } catch (err) {
        console.log("syncByBlockfrost err:", err);
        this.logUtilSrv.logInfo("ChainSyncBlockfrostService", "...syncByBlockfrost error:", err);
      }
      await sleep(chainSyncInterval);
    }
  }

  async scan_txs_by_blockNumber(fromBlockNumber, toBlockNumber) {
    let txs = new Array();
    // 根据两个地址进行查询: feeReceiver地址, leader 地址
    // // 1 treasury
    // let treasuryScAddr = await this.configService.getGlobalConfig("treasuryScCfg");
    // console.log("treasuryScAddr:", treasuryScAddr);
    // let txs = await this.scan_txs_by_scAddress_blockNumber(treasuryScAddr, fromBlockNumber, toBlockNumber);
    // console.log("treasuryScAddr txs:", txs);

    // // 2 nftTreasury
    // let bEnableNFT = false;
    // if (bEnableNFT) {
    //   let nftTreasuryScAddr = await this.configService.getGlobalConfig("nftTreasuryScCfg");
    //   console.log("nftTreasuryScAddr:", nftTreasuryScAddr);
    //   let nftTxs = await this.scan_txs_by_scAddress_blockNumber(nftTreasuryScAddr, fromBlockNumber, toBlockNumber);
    //   console.log("nftTreasuryScAddr nftTxs:", nftTxs);
    //   txs = txs.concat(nftTxs);
    // }

    // 3 feeReceiver 
    let feeReceiverAddr = await this.configService.getGlobalConfig("feeReceiverAddress");
    let feeTxs = await this.scan_txs_by_scAddress_blockNumber(feeReceiverAddr, fromBlockNumber, toBlockNumber);
    txs = txs.concat(feeTxs);

    // 4 leader
    let leaderAddr = await this.configService.getGlobalConfig("leaderAddress");
    console.log("leaderAddr:", leaderAddr);
    let leaderTxs = await this.scan_txs_by_scAddress_blockNumber(leaderAddr, fromBlockNumber, toBlockNumber);
    console.log("leader leaderTxs:", leaderTxs);
    txs = txs.concat(leaderTxs);

    // need to confirm no repeat tx data
    return txs;
  }

  async scan_txs_by_scAddress_blockNumber(scAddr, fromBlockNumber, toBlockNumber) {
    let txsRet = [];
    let txs = await this.blockfrostSyncClient.query_txs_by_address(scAddr, fromBlockNumber, toBlockNumber);

    for (let idx = 0; idx < txs.length; ++idx) {
      let tx = txs[idx];
      let txInfo = await this.blockfrostSyncClient.query_txinfo_by_hash(tx.tx_hash);
      txInfo.tx_hash = tx.tx_hash;
      txInfo.tx_index = tx.tx_index;
      txInfo.block_height = tx.block_height;
      txInfo.block_time = tx.block_time;
      txInfo.query_address = scAddr;

      txsRet.push(txInfo);
    }

    return txsRet;
  }

  async getNextSyncBlockNumber(lastBlock) {
    let nextSyncBlockNumber;
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
      const blockDataOnChain = await this.blockfrostSyncClient.get_block(i);
      console.log("getNextSyncBlockNumber...block data from on chain:", blockDataOnChain);
      if (undefined === blockDataOnChain) {
        this.logUtilSrv.logInfo("getNextSyncBlockNumber", "exception for getting block data from on chain:", i);

        await sleep(1000);
        continue;
      }

      const blockDataInDB = await blockInfoDbObj.findByOption({ blockHeight: i });
      console.log("getNextSyncBlockNumber...block data from on db:", blockDataInDB);
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
      // step 3:  to update chainsyncinfos record
      let ret = await blockInfoDbObj.findByOption({ blockHeight: nextSyncBlockNumber - 1 });
      let syncedBlock = ret[0];
      syncedBlock.height = syncedBlock.blockHeight;
      syncedBlock.id = syncedBlock.blockHash;
      let blockfrostBlockHandler = mapBlockHandler.get("BlockfrostBlockType");
      await blockfrostBlockHandler.updateSyncedInfo(syncedBlock, syncedBlock.time, mapDbNameInst);
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
    let validLatestBlock = lastBlock.height - 1;
    while (nextSyncBlockNumber <= validLatestBlock) {
      let block_map = new Map();
      //let begin_slot, end_slot;

      this.logUtilSrv.logInfo("scan_block_batch", "...get_block...from", nextSyncBlockNumber);
      let fromBlockNumber, toBlockNumber;
      for (let idx = 0; idx < batchScanCount; ++idx) {
        let curBlock = await this.blockfrostSyncClient.get_block(nextSyncBlockNumber);
        curBlock.id = curBlock.hash;
        curBlock.transactions = [];
        console.log("scan_block_batch 2 curBlock:", curBlock);
        if (idx === 0) {
          //begin_slot = curBlock.slot;
          fromBlockNumber = curBlock.height;
        }
        //end_slot = curBlock.slot;
        toBlockNumber = curBlock.height;
        block_map.set(curBlock.height, curBlock);

        ++nextSyncBlockNumber;
        if (nextSyncBlockNumber === lastBlock.height) {
          //console.log("\n\n...scan_block_batch inner for: ", begin_slot, end_slot);
          await sleep(500);
          break;
        }
      }

      this.logUtilSrv.logInfo("scan_block_batch", "...get_block...to", nextSyncBlockNumber);
      // console.log("\n\n...scan_block_batch: ", begin_slot, end_slot);
      console.log("\n\n...scan_block_batch fromBlockNumber: ", fromBlockNumber, "toBlockNumber:", toBlockNumber);
      let txs = await this.scan_txs_by_blockNumber(fromBlockNumber, toBlockNumber);
      for (let idx = 0; idx < txs.length; ++idx) {
        let tx = txs[idx];
        let block = block_map.get(tx.block_height);
        block.transactions.push(tx);
      }

      for (let [blockNumber, curBlock] of block_map) {
        let blockfrostBlockHandler = mapBlockHandler.get("BlockfrostBlockType");
        await blockfrostBlockHandler.processBlock(curBlock, mapDbNameInst, curBlock.transactions);
        console.log("scan_block_batch 13 ");
        await this.updateSyncedInfo();
        console.log("scan_block_batch update syncedBlockNumber:", blockNumber);
      }

      await sleep(500);
    }
  }
}

module.exports = ChainSyncBlockfrostService;
