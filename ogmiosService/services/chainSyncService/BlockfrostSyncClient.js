//const axios = require('axios');
const BlockFrostAPI = require('@blockfrost/blockfrost-js').BlockFrostAPI;

const {
  convertIndexApiUtxoToMaestro,
  decodeTxCborFromBlockFrost
} = require("../utilService/commonUtils");

class BlockfrostSyncClient {
  constructor(projectId, logInst) {
    this.config = {
      projectId: projectId,
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
        ]
      }
    }

    this.logUtil = logInst;

    this.config.calculateDelay = (retryObject) => {
      return retryObject.computedValue !== 0 ? 1000 : 0;
    }

    this.blockFrostApi = new BlockFrostAPI(this.config);

    this.blockFrostAccessStatic = {
      "totalNum": 0,
      "successNum": 0,
      "failedNum": 0,
      "req4block": 0,
      "req4addressesTransactions": 0,
      "req4txCbor": 0,
      "req4txs": 0,
      "req4txsUtxos": 0,
      "req4txsMetadata": 0,
      "curTs": Date.now() / 1000
    };

  }

  updateAccessStatics(bSuccess = true) {
    let preStaticTs = this.blockFrostAccessStatic.curTs;

    if (bSuccess) {
      this.blockFrostAccessStatic.successNum++;
    } else {
      this.blockFrostAccessStatic.failedNum++;
    }

    this.blockFrostAccessStatic.totalNum++;
    this.blockFrostAccessStatic.curTs = Date.now() / 1000;

    let durationTs = this.blockFrostAccessStatic.curTs - preStaticTs;
    this.logUtil.logInfo("BlockfrostClient4ChainSync", "durationTs", durationTs);
    if (durationTs >= 60 * 10) {
      this.logUtil.logInfo("BlockfrostClient4ChainSync", "updateAccessStatics", this.blockFrostAccessStatic);
    }
  }

  async get_block(blockHeight = "latest") {
    if (undefined === blockHeight) {
      blockHeight = "latest";
    }
    let blockInfo = undefined;      

    try {
      this.blockFrostAccessStatic.req4block++;
      blockInfo = await this.blockFrostApi.blocks(blockHeight);
      this.logUtil.logInfo("\n\nBlockForstClient", "...blockInfo: ", blockInfo);

      this.updateAccessStatics(true);
    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...get blockInfo error: ", e);
      this.updateAccessStatics(false);
      throw e;
    }

    return blockInfo;
  }

  async query_txs_by_address(addr, from, to) {

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
          from: from,
          to: to
        };

        this.blockFrostAccessStatic.req4addressesTransactions++;
        let pageTxs = await this.blockFrostApi.addressesTransactions(addr, paginationOptions, cursorPaginationOptions);
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
      throw e;
    }

    this.logUtil.logInfo("\n\nBlockForstClient", "...queryAddressTxs end: ", addressTxs.length);
    return addressTxs;
  }

  async query_txinfo_by_hash(txHash) {
    let txInfo = undefined;

    try {
      this.blockFrostAccessStatic.req4txCbor++;
      let txCbor = await this.blockFrostApi.txsCbor(txHash);
      this.updateAccessStatics(true);
      console.log("\n\nBlockForstClient...txCbor: ", txCbor.cbor);
      this.logUtil.logInfo("BlockForstClient", "...txCbor: ", txCbor.cbor);
      txInfo = await decodeTxCborFromBlockFrost(txCbor.cbor);

      // to get tx state from tx basic info
      this.blockFrostAccessStatic.req4txs++;
      let txInfo_basic = await this.blockFrostApi.txs(txHash);
      this.updateAccessStatics(true);
      console.log("\n\n...txInfo_basic: ", txInfo_basic);
      if (txInfo_basic.valid_contract === true) {
        txInfo.spends = "inputs";
      } else {
        txInfo.spends = "collaterals";
      }

      // add tx id for txInfo
      txInfo.id = txHash;

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "...get txsCbor error: ", e);
      this.updateAccessStatics(false);
      throw e;
    }

    this.logUtil.logInfo("\n\nBlockForstClient", "...queryTx: ", txInfo);
    return txInfo;
  }



  async query_txUtxos_byHash(txHash) {
    let txUtxos = {};

    try {
      this.blockFrostAccessStatic.req4txsUtxos++;
      let ret = await this.blockFrostApi.txsUtxos(txHash);
      this.logUtil.logInfo("\n\nBlockForstClient......txsUtxos ret: ", txHash, ret);
      if (undefined == ret) {
        return txUtxos;
      }

      txUtxos.inputs = new Array();
      for (let i = 0; i < ret.inputs.length; i++) {
        let item = ret.inputs[i];
        txUtxos.inputs.push(item);
      }

      txUtxos.outputs = new Array();
      for (let j = 0; j < ret.outputs.length; j++) {
        let item = ret.outputs[j];
        txUtxos.outputs.push(item);
      }

      this.updateAccessStatics(true);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......get txsUtxos error: ", e);
      this.updateAccessStatics(false);
    }

    // this.logUtil.logInfo("\n\nBlockForstClient", "......query txsUtxos: ", txUtxos);
    return txUtxos;
  }


  async query_txMetaData_byHash(txHash) {
    let txMetaData = undefined;

    try {
      this.blockFrostAccessStatic.req4txsMetadata++;
      txMetaData = await this.blockFrostApi.txsMetadata(txHash);
      this.logUtil.logInfo("\n\nBlockForstClient......txsMetadata ret: ", txHash, ret);

    } catch (e) {
      this.logUtil.logInfo("\n\nBlockForstClient", "......get txsMetadata error: ", e);
      this.updateAccessStatics(false);
    }

    return txMetaData;
  }

}

module.exports = BlockfrostSyncClient;
