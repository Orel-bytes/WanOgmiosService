
const ServiceFramework = require("../../framework/ServiceFramework");

const LOOP_INTERVAL = 15 * 1000;
const MAX_DURATION = 30 * 60 * 1000;

const idleSleep = function (time) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(time, 0)));
};

const {
  convertMaestroProtocolParams,
  convertMaestroEraSummariesInfo,
  convertMaestroGenesisConfig,
  formatChainTipFromIndexApi,
  formatEraSummariesFromIndexApi,
  formatProtocolParamsFromIndexApi,
  formatProtocolParamsFromBlockFrost,
  GenesisConfig
} = require("../utilService/commonUtils");


class CacheDataManager {

  /**
   *Creates an instance of CacheDataManager.
   * @memberof CacheDataManager
   */
  constructor() {
    this.cache = new Map();
    this.curChainSlot = undefined;
  }

  async init() {
    // to scan rp db records and to get the timeout rp
    await this._getServiceInstance();
  }

  async _getServiceInstance() {
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
    this.routerService = ServiceFramework.getService("EndPointServiceInterface", "OgmiosRouterService");

    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.cacheDataConfig = await this.configService.getGlobalConfig("cacheDataConfig");

    this.dataSourceType = await this.configService.getGlobalConfig("dataSourceType");
    this.network = await this.configService.getGlobalConfig("network");;
  }

  /**
   * service 实例可以用时，返回 true, 否则返回 false
   * @returns {Promise<boolean>}
   */
  async checkRouterService() {
    if (!this.routerService) {
      await this._getServiceInstance();
    }
    return !!this.routerService;
  }

  getCacheDataByName(param_Name) {
    let latestRecord = this.cache.get(param_Name);
    console.log("CacheDataManager::getCacheDataByName(): ", param_Name, JSON.stringify(latestRecord));
    this.logUtilSrv.logInfo("CacheDataManager...getCacheDataByName", param_Name, JSON.stringify(latestRecord));
    if (undefined === latestRecord) {
      return undefined;
    }
    return latestRecord;
  }

  _updateCacheData(paramName, data) {
    let curTs = Date.now();
    let curRecord = {
      "ts": curTs, //add slot from chainTip
      "data": data,
      "slot": this.curChainSlot
    }
    this.cache.set(paramName, curRecord);
    this.logUtilSrv.logInfo("CacheDataManager...", "updateCacheData..item:", paramName);
    this.logUtilSrv.logInfo("CacheDataManager...", "updateCacheData..curRecord:", curRecord);
    this.logUtilSrv.logInfo("CacheDataManager...", "cache size: ", this.cache.size);
  }

  async updateChainTip() {
    // this.logUtilSrv.logInfo("CacheDataManager...update cache data", "updateChainTip...begin:", Date.now());
    try {
      let chainTip = undefined;
      if (2 === this.dataSourceType) {
        // this.logUtilSrv.logInfo("CacheDataManager...update cache data", "chainTip...by IndexAPI:", Date.now());
        let indexChainTip = await this.routerService.serviceHandler.indexApiClient.chainTip();
        if (undefined === indexChainTip) {
          throw "fetch chainTip from indexAPI failed!"
        }
        chainTip = formatChainTipFromIndexApi(indexChainTip);

      } else if (3 === this.dataSourceType) {
        // this.logUtilSrv.logInfo("CacheDataManager...update cache data", "chainTip...by blockfrost:", Date.now());
        chainTip = await this.routerService.serviceHandler.blockfrostClient.chainTip();
        if (undefined === chainTip) {
          throw "fetch chainTip from blockfrost failed!"
        }

      } else {
        chainTip = await this.routerService.serviceHandler.queryClient.networkTip();
        chainTip.hash = chainTip.id;
      }

      // let chainTip = await this.routerService.serviceHandler.queryClient.networkTip();
      // chainTip.hash = chainTip.id;
      this.curChainSlot = chainTip.slot;
      this._updateCacheData(this.cacheDataConfig.ChainTip, chainTip);

      // console.log("CacheDataManager::updateChainTip() getChainTip: ", JSON.stringify(chainTip));
      this.logUtilSrv.logInfo("CacheDataManager::updateChainTip() getChainTip: ", this.dataSourceType, JSON.stringify(chainTip));
    } catch (e) {
      this.logUtilSrv.logInfo("CacheDataManager::updateChainTip() catch error: ", e);
    }
  }

  async updateEpochParams() {
    let preRecord = this.cache.get(this.cacheDataConfig.EraSummaries);
    if (undefined !== preRecord) {
      let curTs = Date.now();
      let duration = curTs - preRecord.ts
      if (MAX_DURATION > duration) {
        return;
      }
    }

    try {

      let eraSummaries = undefined;
      if (2 === this.dataSourceType) {
        // this.logUtilSrv.logInfo("CacheDataManager...update cache data", "eraSummaries...by IndexAPI:", Date.now());
        let indexEraSummaries = await this.routerService.serviceHandler.indexApiClient.eraSummaries();
        if (undefined === indexEraSummaries) {
          throw "fetch chainTip from indexAPI failed!"
        }
        eraSummaries = formatEraSummariesFromIndexApi(indexEraSummaries);

      } else if (3 === this.dataSourceType) {
        // this.logUtilSrv.logInfo("CacheDataManager...update cache data", "eraSummaries...by blockfrost:", Date.now());
        eraSummaries = await this.routerService.serviceHandler.blockfrostClient.eraSummaries();
        if (undefined === eraSummaries) {
          throw "fetch eraSummaries from blockfrost failed!"
        }

      } else {
        let maestroEraSummaries = await this.routerService.serviceHandler.queryClient.eraSummaries();
        eraSummaries = convertMaestroEraSummariesInfo(maestroEraSummaries);
      }

      // let maestroEraSummaries = await this.routerService.serviceHandler.queryClient.eraSummaries();
      // eraSummaries = convertMaestroEraSummariesInfo(maestroEraSummaries);
      this._updateCacheData(this.cacheDataConfig.EraSummaries, eraSummaries);

      // console.log("CacheDataManager::updateEpochParams() eraSummaries: ", JSON.stringify(eraSummaries));
      this.logUtilSrv.logInfo("CacheDataManager::updateEpochParams() eraSummaries: ", this.dataSourceType, JSON.stringify(eraSummaries));

    } catch (e) {
      this.logUtilSrv.logInfo("CacheDataManager::updateEpochParams() catch error: ", e);
    }
  }

  // Part 3: security confirm handle
  async updateChainParams() {
    let preRecord = this.cache.get(this.cacheDataConfig.ProtocolParams);
    if (undefined !== preRecord) {
      let curTs = Date.now();
      let duration = curTs - preRecord.ts
      if (MAX_DURATION > duration) {
        return;
      }
    }

    try {

      let protocolParams = undefined;
      if (2 === this.dataSourceType) {
        this.logUtilSrv.logInfo("CacheDataManager...update cache data", "chainParams...by indexAPI:", Date.now());
        let indexProtocolParams = await this.routerService.serviceHandler.indexApiClient.protocolParameters();
        console.log("\nCacheDataManager::updateChainParams() get indexProtocolParams ret: ", JSON.stringify(indexProtocolParams));
        if (undefined === indexProtocolParams) {
          throw "fetch chainTip from indexAPI failed!"
        }

        protocolParams = formatProtocolParamsFromIndexApi(indexProtocolParams);
        console.log("\n\nCacheDataManager::updateChainParams() get protocolParams ret: ", JSON.stringify(protocolParams));

      } else if (3 === this.dataSourceType) {
        this.logUtilSrv.logInfo("CacheDataManager...update cache data", "protocolParameters...by blockfrost:", Date.now());
        let blockfrostProtocolParams = await this.routerService.serviceHandler.blockfrostClient.protocolParameters();
        protocolParams = formatProtocolParamsFromBlockFrost(blockfrostProtocolParams);
        if (undefined === protocolParams) {
          throw "fetch protocolParams from blockfrost failed!"
        }

      } else {
        let maestroProtocolParams = await this.routerService.serviceHandler.queryClient.protocolParameters();
        protocolParams = convertMaestroProtocolParams(maestroProtocolParams);
      }
      // let maestroProtocolParams = await this.routerService.serviceHandler.queryClient.protocolParameters();
      // let protocolParams = convertMaestroProtocolParams(maestroProtocolParams);
      this._updateCacheData(this.cacheDataConfig.ProtocolParams, protocolParams);
      // console.log("\n\nCacheDataManager::updateChainParams() protocolParams: ", JSON.stringify(protocolParams));
      // this.logUtilSrv.logInfo("CacheDataManager", "...currentProtocolParameters...", protocolParams);

      let genesisConfig = undefined;
      if (2 === this.dataSourceType) {

        genesisConfig = Object.assign({}, GenesisConfig[this.network], GenesisConfig.common);
        console.log("CacheDataManager::updateChainParams() get genesisConfig ret: ", JSON.stringify(genesisConfig));

      } else if (3 === this.dataSourceType) {
        genesisConfig = Object.assign({}, GenesisConfig[this.network], GenesisConfig.common);
        console.log("CacheDataManager::updateChainParams() get genesisConfig ret: ", JSON.stringify(genesisConfig));

      } else {
        let maestroGenesisConfig = await this.routerService.serviceHandler.queryClient.genesisConfiguration('shelley');
        genesisConfig = convertMaestroGenesisConfig(maestroGenesisConfig);
      }
      // let maestroGenesisConfig = await this.routerService.serviceHandler.queryClient.genesisConfiguration('shelley');
      // let genesisConfig = convertMaestroGenesisConfig(maestroGenesisConfig);
      genesisConfig.maxLovelaceSupply = undefined;
      console.log('genesisConfig:', genesisConfig.protocolParameters);
      this._updateCacheData(this.cacheDataConfig.GenesisConfig, genesisConfig);
      console.log("CacheDataManager::updateChainParams() genesisConfig: ", JSON.stringify(genesisConfig));

      let epochsParams = {
        "min_fee_a": JSON.stringify(protocolParams.minFeeCoefficient),
        "min_fee_b": JSON.stringify(protocolParams.minFeeConstant),
        "min_utxo": JSON.stringify(genesisConfig.protocolParameters.minUtxoValue),//?? protocolParams.,
        "coins_per_utxo_word": JSON.stringify(protocolParams.coinsPerUtxoByte * 2),
        "coins_per_utxo_byte": JSON.stringify(protocolParams.coinsPerUtxoByte),
        "price_mem": JSON.stringify(protocolParams.prices.memory),
        "price_step": JSON.stringify(protocolParams.prices.steps),
        "collateral_percent": JSON.stringify(protocolParams.collateralPercentage),
        "max_collateral_inputs": JSON.stringify(protocolParams.maxCollateralInputs),
        "pool_deposit": JSON.stringify(protocolParams.poolDeposit),
        "key_deposit": JSON.stringify(protocolParams.stakeKeyDeposit),
        "max_tx_size": JSON.stringify(protocolParams.maxTxSize),
        "max_val_size": JSON.stringify(protocolParams.maxValueSize),
        "min_fee_ref_script_cost_per_byte": JSON.stringify(protocolParams.minFeeRefScriptCostPerByte),
        "minFeeRefScriptCostPerByte": JSON.stringify(protocolParams.minFeeRefScriptCostPerByte)
      }
      this._updateCacheData(this.cacheDataConfig.EpochsParams, epochsParams);
      console.log("CacheDataManager::updateChainParams() epochsParams: ", JSON.stringify(epochsParams));

      this.logUtilSrv.logInfo("CacheDataManager::updateChainParams() epochsParams: ", this.dataSourceType, JSON.stringify(epochsParams));
    } catch (e) {
      this.logUtilSrv.logError("CacheDataManager::updateChainParams() catch error: ", JSON.stringify(e));
      console.log("fetchProtocolParams error: ", e);
    }
  }

  async loopTask(taskId, taskFunc) {
    for (; ;) {
      try {
        const isServiceOK = await this.checkRouterService();
        if (!isServiceOK) {
          await idleSleep(1000);
          continue;
        }
        await taskFunc();

      } catch (e) {
        this.logUtilSrv.logError(`CacheDataManager '${taskId}' catch error: `, e);
      }

      await idleSleep(LOOP_INTERVAL);
    }
  }

  async startUp() {
    this.logUtilSrv.logInfo("CacheDataManager::start...");
    // to check RouterService status

    this.loopTask("task_updateChainTip", () => this.updateChainTip());
    this.loopTask("task_updateEpochParams", () => this.updateEpochParams());
    this.loopTask("task_updateChainParams", () => this.updateChainParams());
  }
}

module.exports = CacheDataManager;
