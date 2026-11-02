

const fs = require('fs');
const cbor = require('cbor');
const BlockFrostAPI = require('@blockfrost/blockfrost-js').BlockFrostAPI;

const {
  convertBlockFrostUtxo2MaestroUtxo,
  decodeTxCborFromBlockFrost

} = require("../utilService/commonUtils");
const { forEach } = require('lodash');

class BlockForstClient {

  constructor(blockfrostConfig, logUtil) {

    let blockfrostOption = {
      projectId: blockfrostConfig.ApiKey,//'preprod2CkSg6ILU3vxDMRn2EOO6hwXtUAOceDF', //'mainnetwyQcQkHH6HTr7eylR6hWwA2Rt5R9AVEY', //
      requestTimeout: 300000,
      retrySettings: {
        limit: 1000, // retry count
        methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'], // no retry on POST
        statusCodes: [408, 413, 429, 500, 502, 503, 504, 520, 521, 522, 524],
        errorCodes: [
          'ETIMEDOUT',
          'ECONNRESET',
          'EADDRINUSE',
          'ECONNREFUSED',
          'EPIPE',
          'ENOTFOUND',
          'ENETUNREACH',
          'EAI_AGAIN',
          'EPROTO',
        ],
        calculateDelay: (retryObject) => {
          return retryObject.computedValue !== 0 ? 1000 : 0;
        }
      }
    }

    this.blockFrostApi = new BlockFrostAPI(blockfrostOption);
    this.logUtil = logUtil;

    this.mapScriptRecord = new Map();

    this.blockFrostAccessStatic = {
      "totalNum": 0,
      "successNum": 0,
      "failedNum": 0,
      "req4evaluateTx": 0,
      "req4txSubmit": 0,
      "req4addressesUtxos": 0,
      "req4addressesTransactions": 0,
      "req4txsCbor": 0,
      "req4txsUtxos": 0,
      "req4scriptsByHash": 0,
      "req4scriptsCbor": 0,
      "req4scriptsJson": 0,
      "req4blocks": 0,
      "req4assetsPolicyById": 0,
      "req4assetsTransactions": 0,
      "req4chainTip": 0,
      "req4networkEras": 0,
      "req4epochsLatestParameters": 0,
      "req4accounts": 0,
      "curTs": Date.now() / 1000
    };
  }

  updateAccessStatics(bSuccess = true) {

    if (bSuccess) {
      this.blockFrostAccessStatic.successNum++;
    } else {
      this.blockFrostAccessStatic.failedNum++;
    }

    this.blockFrostAccessStatic.totalNum++;

    let curStaticTs = Date.now() / 1000;
    let durationTs = curStaticTs - this.blockFrostAccessStatic.curTs;
    this.logUtil.logInfo("BlockfrostClient4EndPoint", "durationTs", durationTs);

    if (durationTs >= 60 * 10) {
      this.blockFrostAccessStatic.curTs = Date.now() / 1000;
      this.logUtil.logInfo("BlockfrostClient4EndPoint", "updateAccessStatics", this.blockFrostAccessStatic);
    }
  }

  async evaluateTx(strRawdata) {
    let evaluateTxRet = undefined;

    try {
      this.blockFrostAccessStatic.req4evaluateTx++;
      evaluateTxRet = await this.blockFrostApi.utilsTxsEvaluate(strRawdata);
      this.logUtil.logInfo("\n\nBlockForstClient", "...evaluateTx", evaluateTxRet);

      this.updateAccessStatics(true);

      if (undefined === evaluateTxRet.result.EvaluationResult) {
        let error = {
          "code": 3010, "data":
            [{
              "error": {
                "code": 3012,
                "message": "evaluate tx failed from blockfrost.", "data": { "validationError": "An error has occurred", "traces": ["expect [ref_input] = matching"] }
              }
            }],
          "id": {}
        }
        throw error;
      }

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...evaluateTx error: ", e);
      this.updateAccessStatics(false);
      throw e;
    }

    this.logUtil.logInfo("\n\nBlockForstClient", "...evaluateTx ret: ", evaluateTxRet);
    //  {"spend:0":{"memory":342107,"steps":107536290},"spend:1":{"memory":603993,"steps":185008555}}
    console.log("\n\nBlockForstClient......evaluateTx ret: ", JSON.stringify(evaluateTxRet.result.EvaluationResult));

    return evaluateTxRet.result.EvaluationResult;

  }

  async txSubmit(strRawdata) {
    let submitRet = undefined;

    try {
      this.blockFrostAccessStatic.req4txSubmit++;
      submitRet = await this.blockFrostApi.txSubmit(strRawdata);
      this.logUtil.logInfo("\n\nBlockForstClient", "......txSubmit: ", submitRet);

      this.updateAccessStatics(true);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......txSubmit error: ", e);
      this.updateAccessStatics(false);
    }

    this.logUtil.logInfo("\n\nBlockForstClient", "......txSubmit ret: ", submitRet);
    return submitRet;
  }

  async queryAddressUtxos(strAddress) {
    if (undefined === strAddress) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......queryAddressUtxos...", "invalid param...address is undefined!");
      return undefined;
    }

    let addressUtxos = new Array();
    // let utxos = undefined;
    try {
      let pageIndex = 1;
      let itemCount = 100;

      do {
        let curTsBeforeCheck = Date.now();

        let paginationOptions = {
          count: itemCount,
          page: pageIndex,
          order: 'asc'
        }
        this.blockFrostAccessStatic.req4addressesUtxos++;
        let utxos = await this.blockFrostApi.addressesUtxos(strAddress, paginationOptions);
        this.logUtil.logInfo("\n\nBlockForstClient......queryAddressUtxos...", pageIndex, utxos);
        addressUtxos = addressUtxos.concat(utxos);

        this.updateAccessStatics(true);

        if (utxos.length < itemCount) {
          break;
        } else {
          pageIndex++;
        }

      } while (true);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......queryAddressUtxos...error:", e);
      this.updateAccessStatics(false);
      return false;
    }

    let formatUtxos = new Array();
    for (let i = 0; i < addressUtxos.length; i++) {
      let utxoItem = addressUtxos[i];
      let formatUtxoItem = convertBlockFrostUtxo2MaestroUtxo(utxoItem);
      if (undefined === formatUtxoItem) {
        continue;
      }

      if ((undefined !== utxoItem.reference_script_hash)
        && (null !== utxoItem.reference_script_hash)) {
        let scriptRecord = this.mapScriptRecord.get(utxoItem.reference_script_hash);
        if (undefined === scriptRecord) {
          scriptRecord = await this.queryScriptInfo(utxoItem.reference_script_hash);
          this.mapScriptRecord.set(utxoItem.reference_script_hash, scriptRecord);
        }

        formatUtxoItem.script = scriptRecord;
      }

      formatUtxos.push(formatUtxoItem);
    }

    this.logUtil.logInfo("\n\nBlockForstClient", "......queryAddressUtxos end: ", formatUtxos.length);
    return formatUtxos;
  }

  async queryAddressTxs(strAddress, beginBlockNo, endBlockNo) {

    let addressTxs = new Array();

    try {
      let pageIndex = 1;
      let itemCount = 100;

      do {
        let paginationOptions = {
          count: itemCount,
          page: pageIndex,
          order: 'asc'
        }

        let cursorPaginationOptions = {
          from: beginBlockNo,
          to: endBlockNo
        };

        this.blockFrostAccessStatic.req4addressesTransactions++;
        let pageTxs = await this.blockFrostApi.addressesTransactions(strAddress, paginationOptions, cursorPaginationOptions);
        console.log('\n...queryAddressTxs...txs: ', pageIndex, pageTxs.length);
        addressTxs = addressTxs.concat(pageTxs);

        this.updateAccessStatics(true);

        if (pageTxs.length < itemCount) {
          break;
        } else {
          pageIndex++;
        }

      } while (true);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...queryAddressTxs...get utxo refs failed:", e);
      this.updateAccessStatics(false);
      return undefined;
    }

    this.logUtil.logInfo("\n\nBlockForstClient", "...queryAddressTxs end: ", addressTxs.length);
    return addressTxs;
  }

  async queryTxByHash(txHash) {
    let txInfo = undefined;

    try {
      this.blockFrostAccessStatic.req4txsCbor++;
      let txCbor = await this.blockFrostApi.txsCbor(txHash);
      this.logUtil.logInfo("\n\nBlockForstClient", "...txCbor: ", txCbor);

      this.updateAccessStatics(true);

      txInfo = decodeTxCborFromBlockFrost(txCbor);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...get txsCbor error: ", e);
      this.updateAccessStatics(false);
    }

    this.logUtil.logInfo("\n\nBlockForstClient", "...queryTx: ", txInfo);
    return txInfo;
  }

  async queryTxUtxos(txHash) {
    let txUtxos = undefined;

    try {
      this.blockFrostAccessStatic.req4txsUtxos++;
      txUtxos = await this.blockFrostApi.txsUtxos(txHash);
      this.logUtil.logInfo("\n\nBlockForstClient", "......txsUtxos: ", txUtxos);

      this.updateAccessStatics(true);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......get txsUtxos error: ", e);
      this.updateAccessStatics(false);
    }

    // this.logUtil.logInfo("\n\nBlockForstClient", "......query txsUtxos: ", txUtxos);
    return txUtxos;
  }

  async queryUtxosByRef(txInAry) {
    if ((undefined === txInAry) || (0 === txInAry.length)) {
      this.logUtil.logInfo("\n\nBlockForstClient", "queryUtxosByRef...invalid param: ", txInAry);
      return undefined;
    }

    let targetUtxos = new Array();
    try {
      for (let i = 0; i < txInAry.length; i++) {
        if ((undefined === txInAry[i].transaction)
          || (undefined === txInAry[i].transaction.id)
          || (undefined === txInAry[i].index)) {
          continue;
        }

        let txId = txInAry[i].transaction.id;
        let index = txInAry[i].index;

        this.blockFrostAccessStatic.req4txsUtxos++;
        let txUtxos = await this.blockFrostApi.txsUtxos(txId);
        this.updateAccessStatics(true);

        let outputs = txUtxos.outputs;
        let utxoItem = outputs[index];
        if (undefined === utxoItem) {
          continue;
        }
        // to add tx_hash value to utxoItem for convertBlockFrostUtxo2MaestroUtxo
        utxoItem.tx_hash = txId;
        utxoItem.output_index = index;

        targetUtxos.push(utxoItem);
        this.logUtil.logInfo("\n\nBlockForstClient", "queryUtxosByRef...utxoItem: ", utxoItem);
      }

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...get txsUtxos error: ", e);
      this.updateAccessStatics(false);
      return undefined;
    }

    let formatUtxos = new Array();
    for (let j = 0; j < targetUtxos.length; j++) {
      let utxoItem = targetUtxos[j];
      let formatUtxoItem = convertBlockFrostUtxo2MaestroUtxo(utxoItem);
      if (undefined === formatUtxoItem) {
        continue;
      }

      if ((undefined !== utxoItem.reference_script_hash)
        && (null !== utxoItem.reference_script_hash)) {
        let scriptRecord = this.mapScriptRecord.get(utxoItem.reference_script_hash);
        if (undefined === scriptRecord) {
          scriptRecord = await this.queryScriptInfo(utxoItem.reference_script_hash);
          this.mapScriptRecord.set(utxoItem.reference_script_hash, scriptRecord);
        }
        formatUtxoItem.script = scriptRecord;
      }

      formatUtxos.push(formatUtxoItem);
    }

    this.logUtil.logInfo("\n\nBlockForstClient", "queryUtxosByRef...formatUtxos: ", formatUtxos);
    return formatUtxos;
  }

  async queryScriptInfo(scriptHash) {

    if ((undefined === scriptHash) || (null === scriptHash)) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...invalid params: ", scriptHash);
      return undefined;
    }

    let scriptRecord = undefined;
    try {
      this.logUtil.logInfo("\n\nBlockForstClient", "queryScriptInfo...scriptHash: ", scriptHash);
      this.blockFrostAccessStatic.req4scriptsByHash++;
      let scriptInfo = await this.blockFrostApi.scriptsByHash(scriptHash);
      this.updateAccessStatics(true);

      this.blockFrostAccessStatic.req4scriptsCbor++;
      let scriptCbor = await this.blockFrostApi.scriptsCbor(scriptHash);
      this.updateAccessStatics(true);

      this.blockFrostAccessStatic.req4scriptsJson++;
      let scriptJson = await this.blockFrostApi.scriptsJson(scriptHash);
      this.updateAccessStatics(true);

      scriptRecord = {
        "language": scriptInfo.type,
        "cbor": scriptCbor.cbor,
        "json": scriptJson,
        "hash": scriptHash
      }
      this.logUtil.logInfo("\n\nBlockForstClient", "...query ScriptInfo: ", scriptRecord);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...query ScriptInfo error: ", e);
      this.updateAccessStatics(false);
    }

    return scriptRecord;
  }

  async queryBlock(blockHeight = "latest") {
    if (undefined === blockHeight) {
      blockHeight = "latest";
    }
    let blockInfo = undefined;

    try {
      this.blockFrostAccessStatic.req4blocks++;
      blockInfo = await this.blockFrostApi.blocks(blockHeight);
      this.logUtil.logInfo("\n\nBlockForstClient", "...blockInfo: ", blockInfo);

      this.updateAccessStatics(true);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...get blockInfo error: ", e);
      this.updateAccessStatics(false);
    }

    return blockInfo;
  }

  async queryAssetsByPolicyId(policyId) {
    let assetsByPolicyId = new Array();

    try {
      this.blockFrostAccessStatic.req4assetsPolicyById++;
      assetsByPolicyId = await this.blockFrostApi.assetsPolicyByIdAll(policyId);
      this.logUtil.logInfo("\n\nBlockForstClient", "...\n...assetsByPolicyIdAll...: ", assetsByPolicyId);

      this.updateAccessStatics(true);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......queryAssetsByPolicyId error: ", e);
      this.updateAccessStatics(false);
      return undefined;
    }

    return assetsByPolicyId;
  }

  async queryTxsByPolicyId(policyId) {
    let assetsByPolicyId = await this.queryAssetsByPolicyId(policyId);
    if (undefined === assetsByPolicyId) {
      this.logUtil.logInfo("\n\nBlockForstClient", "accountInfo...invalid params: ", strStakeAddress);
      return undefined;
    }

    let txsFiltedByPolicyId = new Array();

    try {

      for (let i = 0; i < assetsByPolicyId.length; i++) {
        let assetObj = assetsByPolicyId[i];
        let assetId = assetObj.asset;

        let pageIndex = 1;
        let itemCount = 100;
        let txsByAssetId = new Array();

        do {
          let paginationOptions = {
            count: itemCount,
            page: pageIndex,
            order: 'asc'
          }
          this.blockFrostAccessStatic.req4assetsTransactions++;
          let txs = await this.blockFrostApi.assetsTransactions(assetId, paginationOptions);
          this.logUtil.logInfo('...assetsTransactions of assetId: ', pageIndex, assetId, txs);
          txsByAssetId = txsByAssetId.concat(txs);

          this.updateAccessStatics(true);

          if (txs.length < itemCount) {
            break;
          } else {
            pageIndex++;
          }

        } while (true);

        txsFiltedByPolicyId = txsFiltedByPolicyId.concat(txsByAssetId);
        this.logUtil.logInfo('\n\n\n...txsFiltedByPolicyId length...: ', txsByAssetId[0], txsFiltedByPolicyId.length);
      }

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...assetsHistory...error:", e);
      this.updateAccessStatics(false);
      return undefined;
    }

    this.logUtil.logInfo("\n\nBlockForstClient", "...txsFiltedByPolicyId total length...: ", txsFiltedByPolicyId.length);
    return txsFiltedByPolicyId;
  }

  async chainTip() {
    let chainTip = undefined;

    try {
      this.blockFrostAccessStatic.req4chainTip++;
      let latestBlock = await this.blockFrostApi.blocks("latest");
      this.updateAccessStatics(true);

      chainTip = {
        slot: latestBlock.slot,
        id: latestBlock.hash,
        hash: latestBlock.hash
      }
      this.logUtil.logInfo("\n\nBlockForstClient", "......chainTip: ", chainTip);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......get chainTip error: ", e);
      this.updateAccessStatics(false);
    }

    return chainTip;
  }

  async eraSummaries() {
    let formatedEraSummaries = new Array();

    try {
      this.blockFrostAccessStatic.req4networkEras++;
      let eraSummaries = await this.blockFrostApi.networkEras();
      this.updateAccessStatics(true);

      for (let i = 0; i < eraSummaries.length; i++) {
        let item = {};
        item.start = eraSummaries[i].start;
        item.end = eraSummaries[i].end;
        item.parameters = {
          "epochLength": eraSummaries[i].parameters.epoch_length,
          "slotLength": eraSummaries[i].parameters.slot_length,
          "safeZone": eraSummaries[i].parameters.safe_zone
        };
        formatedEraSummaries.push(item);
      }
      this.logUtil.logInfo("\n\nBlockForstClient", "......eraSummaries: ", formatedEraSummaries);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......get eraSummaries error: ", e);
      this.updateAccessStatics(false);
      return undefined;
    }

    return formatedEraSummaries;
  }

  async protocolParameters() {

    let latestParameters = undefined;
    try {
      this.blockFrostAccessStatic.req4epochsLatestParameters++;
      latestParameters = await this.blockFrostApi.epochsLatestParameters();
      this.logUtil.logInfo("\n\nBlockForstClient", "......eraSummaries: ", latestParameters);
      this.updateAccessStatics(true);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......get protocolParameters error: ", e);
      this.updateAccessStatics(false);
    }

    return latestParameters;
  }

  async accountInfo(strStakeAddress) {
    if (undefined === strStakeAddress) {
      this.logUtil.logInfo("\n\nBlockForstClient", "accountInfo...invalid params: ", strStakeAddress);
      return undefined;
    }

    let delegatedPoolId = undefined;
    let rewardsAvailable = undefined;
    try {
      this.blockFrostAccessStatic.req4accounts++;
      let accountInfo = await this.blockFrostApi.accounts();
      this.updateAccessStatics(true);
      delegatedPoolId = accountInfo.pool_id;
      rewardsAvailable = accountInfo.rewards_sum;

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......get chainTip error: ", e);
      this.updateAccessStatics(false);
      return undefined;
    }

    let ret = {
      "delegate": delegatedPoolId,
      "rewards": rewardsAvailable
    }

    return ret;
  }

}



module.exports = BlockForstClient;


