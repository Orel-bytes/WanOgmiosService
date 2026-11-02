const ChainSyncServiceInterface = require('../../interfaces/ChainSyncServiceInterface');
const ServiceFramework = require("../../framework/ServiceFramework");
const { sleep } = require("../utilService/commonUtils");
const AlonzoBlockHandler = require("./AlonzoBlockHandler");
const AllegraBlockHandler = require("./AllegraBlockHandler");
const ByronBlockHandler = require("./ByronBlockHandler");
const MaryBlockHandler = require("./MaryBlockHandler");
const ShelleyBlockHandler = require("./ShelleyBlockHandler");
const BabbageBlockHandler = require("./BabbageBlockHandler");
const TreasuryUtxoManager = require("./TreasuryUtxoManager");
const {
  createInteractionContext,
  createChainSyncClient,
  isAlonzoBlock,
  isByronStandardBlock,
  isShelleyBlock,
  isMaryBlock,
  isAllegraBlock,
  isBabbageBlock
} = require('@cardano-ogmios/client');

const mapDbNameInst = new Map();
const mapBlockHandler = new Map();
let bInitialSynced = true;

class ChainSyncService extends ChainSyncServiceInterface {
  constructor() {
    super();

    this.chainType = "ADA";
    this.mapUtxoManager = new Map();
  }

  async init() {
    // step 1: to get related service component
    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.storageService = ServiceFramework.getService("StorageServiceInterface", "StorageService");
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
    this.iWanService = ServiceFramework.getService("AgentServiceInterface", "IWanService");

    this.iWanClientObj = this.iWanService.getIWanClientInstance();

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

    this.securityConfirmEnable = await this.configService.getGlobalConfig("securityConfirmEnable");
    console.log("\n\n...ChainSyncService init...securityConfirmEnable : ", this.securityConfirmEnable);

    // to initial treasury utxo manager instance TreasuryCfg
    this.ogmiosServerConfig = await this.configService.getGlobalConfig("ogmiosServerCfg");
    let treasuryScCfg = await this.configService.getGlobalConfig("treasuryScCfg");
    let nftTreasuryScCfg = await this.configService.getGlobalConfig("nftTreasuryScCfg");
    let checkTokenPolicyIdCfg = await this.configService.getGlobalConfig("checkTokenPolicyIdCfg");
    let nftCheckTokenPolicyIdCfg = await this.configService.getGlobalConfig("nftCheckTokenPolicyIdCfg");
    console.log("\n\n...ChainSyncService init...step 2-1 : ");

    // to instance a utxo manager for treasury contract
    this.treasuryUtxoMgrObj = new TreasuryUtxoManager(treasuryScCfg, mapDbNameInst, this.ogmiosServerConfig, checkTokenPolicyIdCfg);
    let initRet = await this.treasuryUtxoMgrObj.init();
    if (!initRet) {
      throw "treasuryUtxoManager init failed!"
    }
    this.mapUtxoManager.set("NonNFT", this.treasuryUtxoMgrObj);

    //  instance a utxo mananger for nftTreasury contract
    this.nftTreasuryUtxoMgrObj = new TreasuryUtxoManager(nftTreasuryScCfg, mapDbNameInst, this.ogmiosServerConfig, nftCheckTokenPolicyIdCfg);
    initRet = await this.nftTreasuryUtxoMgrObj.init();
    if (!initRet) {
      throw "nftTreasuryUtxoManager init failed!"
    }
    this.mapUtxoManager.set("NFT", this.nftTreasuryUtxoMgrObj);

    // register block hander
    this.alonzoBlockHander = new AlonzoBlockHandler();
    mapBlockHandler.set("AlonzoBlockType", this.alonzoBlockHander);
    this.allegraBlockHandler = new AllegraBlockHandler();
    mapBlockHandler.set("AllegraBlockType", this.allegraBlockHandler);
    this.byronBlockHandler = new ByronBlockHandler();
    mapBlockHandler.set("ByronBlockType", this.byronBlockHandler);
    this.maryBlockHandler = new MaryBlockHandler();
    mapBlockHandler.set("MaryBlockType", this.maryBlockHandler);
    this.shelleyBlockHandler = new ShelleyBlockHandler();
    mapBlockHandler.set("ShelleyBlockType", this.shelleyBlockHandler);
    this.babbageBlockHandler = new BabbageBlockHandler(this.mapUtxoManager, this.securityConfirmEnable, this.iWanClientObj);
    mapBlockHandler.set("BabbageBlockType", this.babbageBlockHandler);

    // initial ogmios client
    await this.connectOgmiosNode();

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

      let initialSyncTip = {
        "slot": this.chainSyncedInfo.syncedSlot,
        "hash": this.chainSyncedInfo.syncedHash
      }
      this.points = new Array();
      this.points.push(initialSyncTip);

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

      let initialSyncTip = {
        "slot": this.chainSyncedInfo.syncedSlot,
        "hash": this.chainSyncedInfo.syncedHash
      }
      // console.log("\n\n...ChainSyncService startUp: ", initialSyncTip);
      this.points = new Array();

      let filter = {
        "blockHeight": { '$gt': this.chainSyncedInfo.syncedBlockNumber - 30, "$lt": this.chainSyncedInfo.syncedBlockNumber }
      }
      console.log("\n\n...ChainSyncService startUp block filter: ", filter);
      let ret = await this.blockInfoDbInst.findAllByOption(filter);
      console.log("\n\n...ChainSyncService startUp blocks: ", ret);

      this.points.push(initialSyncTip);
      for (let i = ret.length - 1; i >= 0; i--) {
        let tmpSyncTip = {
          "slot": ret[i].slot,
          "hash": ret[i].hash
        }
        this.points.push(tmpSyncTip);
      }
    }

  }

  fetchInitSyncedInfo() {

    return this.chainSyncedInfo;
  }


  async reconnectOgmiosNode() {
    setTimeout(async () => {
      try {
        this.logUtilSrv.logInfo("ChainSyncService", "...try to reconnectOgmiosNode...");
        await this.connectOgmiosNode();

        let preSyncedPoint = {
          "slot": this.preSlot,
          "hash": this.preHash
        }
        let prePoints = new Array();
        prePoints.push(preSyncedPoint);
        console.log("ChainSyncService...reconnectOgmiosNode...prePoints...", prePoints);

        this.syncClient.startSync(prePoints, 1);
      } catch (error) {
        this.logUtilSrv.logInfo("ChainSyncService", "...reconnectOgmiosNode...error...", error);
        this.reconnectOgmiosNode();
      }
    }, 10000);
  }

  async connectOgmiosNode() {
    let connectionOption = (undefined === this.ogmiosServerConfig.apiKey) ? {
      host: this.ogmiosServerConfig.host,
      port: this.ogmiosServerConfig.port,
    } : {
      host: this.ogmiosServerConfig.host,
      port: this.ogmiosServerConfig.port,
      tls: true,
      apiKey: this.ogmiosServerConfig.apiKey
    }

    console.log("\n\n***chain Sync service create ws connection");
    this.context = await createInteractionContext(this.errorHandler.bind(this),
      this.closeHandler.bind(this),
      {
        "connection": connectionOption,
        "interactionType": 'LongRunning'
      });

    console.log("\n\n***chain Sync service create sync client");
    this.syncClient = await createChainSyncClient(this.context,
      {
        rollForward: this.rollForward.bind(this),
        rollBackward: this.rollBackward.bind(this)
      });
  }


  async errorHandler(error) {
    console.error(error);
    this.logUtilSrv.logInfo("ChainSyncService", "...errorHandler...error...", error);
    // await client.shutdown();
  }

  async closeHandler(code, reason) {
    // console.log('WS close: code =', code, 'reason =', reason);
    this.logUtilSrv.logInfo("ChainSyncService", "...closeHandler...code...", code);
    this.logUtilSrv.logInfo("ChainSyncService", "...closeHandler...reason...", reason);

    // await client.shutdown();
    await this.reconnectOgmiosNode();
    this.logUtilSrv.logInfo("ChainSyncService", "...closeHandler...", "reconnectOgmiosNode done!");
  }

  //scan block backward nomally
  async rollForward({ block }, requestNext) {

    if (bInitialSynced) {

      let blockInfo = undefined;
      if (isByronStandardBlock(block)) {
        blockInfo = block.byron;

      } else if (isShelleyBlock(block)) {
        blockInfo = block.shelley;

      } else if (isAllegraBlock(block)) {
        blockInfo = block.allegra;

      } else if (isMaryBlock(block)) {
        blockInfo = block.mary;

      } else if (isAlonzoBlock(block)) {
        blockInfo = block.alonzo;

      } else if (isBabbageBlock(block)) {
        blockInfo = block.babbage;
      }

      let blockFilter = {
        "blockHeight": { '$gte': blockInfo.header.blockHeight }
      }

      let blockInfoDbObj = mapDbNameInst.get("blockInfo");
      let ret = await blockInfoDbObj.findAllByOption(blockFilter);
      if (ret.length > 0) {
        console.log("bInitialSynced detect dropped blocks ret: ", blockFilter, ret.length);
        let txInfoDbObj = mapDbNameInst.get("txInfo");
        let mintInfoDbObj = mapDbNameInst.get("mintInfo");
        let treasuryInfoDbObj = mapDbNameInst.get("treasuryUtxoInfo");
        // TODO: handle chain rollback 
        let filter = {
          "slot": { "$gte": blockInfo.header.slot }
        }

        await blockInfoDbObj.deleteByOption(filter);
        await txInfoDbObj.deleteByOption(filter);
        await mintInfoDbObj.deleteByOption(filter);
        await treasuryInfoDbObj.deleteByOption(filter);

      } else {
        console.log("bInitialSynced detect no dropped blocks: ", blockFilter);
      }

      bInitialSynced = false;
    }

    let blockInfo = undefined;

    // let blockInfo;//Byron | Shelley | Allegra | Mary | Alonzo
    if (isByronStandardBlock(block)) {
      blockInfo = block.byron;
      let blockHandlerInst = mapBlockHandler.get("ByronBlockType");
      await blockHandlerInst.processBlock(block, mapDbNameInst);

    } else if (isShelleyBlock(block)) {
      blockInfo = block.shelley;
      let blockHandlerInst = mapBlockHandler.get("ShelleyBlockType");
      await blockHandlerInst.processBlock(block, mapDbNameInst);

    } else if (isAllegraBlock(block)) {
      blockInfo = block.allegra;
      let blockHandlerInst = mapBlockHandler.get("AllegraBlockType");
      await blockHandlerInst.processBlock(block, mapDbNameInst);

    } else if (isMaryBlock(block)) {
      blockInfo = block.mary;
      let blockHandlerInst = mapBlockHandler.get("MaryBlockType");
      await blockHandlerInst.processBlock(block, mapDbNameInst);

    } else if (isAlonzoBlock(block)) {
      blockInfo = block.alonzo;
      let blockHandlerInst = mapBlockHandler.get("AlonzoBlockType");
      await blockHandlerInst.processBlock(block, mapDbNameInst);

    } else if (isBabbageBlock(block)) {
      blockInfo = block.babbage;
      this.logUtilSrv.logInfo("ChainSyncService", "...rollForward...fetch babbage: ",
        blockInfo.header.blockHeight);

      let blockHandlerInst = mapBlockHandler.get("BabbageBlockType");
      await blockHandlerInst.processBlock(block, mapDbNameInst);
    }

    this.preSlot = blockInfo.header.slot;
    this.preHash = blockInfo.headerHash;
    console.log("\n\n\n***ChainSyncService...rollForward...prePoints...", this.preSlot, this.preHash);

    await sleep(5000);
    requestNext();
  }

  // handle chain rollback 
  async rollBackward({ point }, requestNext) {
    // console.log('\n....[ROLLBACK]', point);
    this.logUtilSrv.logInfo("ChainSyncService", "...rollBackward...point...", point);

    // let that = this;
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");
    let mintInfoDbObj = mapDbNameInst.get("mintInfo");
    let treasuryInfoDbObj = mapDbNameInst.get("treasuryUtxoInfo");
    // TODO: handle chain rollback 
    let filter = {
      "slot": { $gt: point.slot }
    }

    await blockInfoDbObj.deleteByOption(filter);
    await txInfoDbObj.deleteByOption(filter);
    await mintInfoDbObj.deleteByOption(filter);
    await treasuryInfoDbObj.deleteByOption(filter);

    this.preSlot = point.slot;
    this.preHash = point.hash;
    console.log("\n\n\n***ChainSyncService...rollBackward...prePoints...", this.preSlot, this.preHash);

    await sleep(1000);
    requestNext();
  }


  async startUp() {

    console.log("\n\n...ChainSyncService startUp this.points: ", this.points);
    await this.syncClient.startSync(this.points, 1);
  }

}

module.exports = ChainSyncService;
