const axios = require('axios');

const {
  convertIndexApiUtxoToMaestro
} = require("../utilService/commonUtils");

class IndexApiSyncClient {
  constructor(cfg, logInst) {
    this.maestroCfg = cfg;
    this.logUtilSrv = logInst;

    this.axios_instance = axios.create({
      baseURL: this.maestroCfg.url,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.maestroCfg.apiKey
      },
      timeout: 120000
    });

    this.reqNum4GetBlock = 0;
    this.reqNum4TxsByAddr = 0;
    this.reqNum4TxInfoByHash = 0;
    this.reqNum4TxByPolicy = 0;

    this.totalReqNum = 0;
    this.curTs = 0;
    this.firstReqTs = 0;
  }

  async get_block(height = 'latest') {
    let url = `blocks/${height}`;
    let ret = await this.axios_instance.get(url);
    console.log("\n\n\n...IndexApiSyncClient...get_block...ret: ", ret);

    this.reqNum4GetBlock++;
    this.totalReqNum = this.reqNum4GetBlock + this.reqNum4TxsByAddr + this.reqNum4TxInfoByHash + this.reqNum4TxByPolicy;
    this.curTs = Date.now();
    if (0 === this.firstReqTs) {
      this.firstReqTs = this.curTs;
    }
    this.logUtilSrv.logInfo("IndexApiSyncClient...get_block.....", this.curTs, this.reqNum4GetBlock);
    this.logUtilSrv.logInfo("IndexApiSyncClient...get_block.....", this.curTs - this.firstReqTs, this.totalReqNum);

    if (ret.status === 200) {
      return ret.data.data;
    }
  }

  async query_txs_by_address(addr, fromSlot, toSlot = undefined) {
    if (toSlot === undefined) {
      toSlot = fromSlot;
    }
    let ret_data = [];
    let cursor = null;
    while (1) {
      let url = `addresses/${addr}/transactions?count=100&order=asc&&from=${fromSlot}&&to=${toSlot}`;
      if (cursor) {
        url = `${url}&&cursor=${cursor}`;
        cursor = null;
      }
      let res = await this.axios_instance.get(url);
      this.logUtilSrv.logInfo("IndexApiSyncClient", "...query_txs_by_address.....", url);

      this.reqNum4TxsByAddr++;
      this.totalReqNum = this.reqNum4GetBlock + this.reqNum4TxsByAddr + this.reqNum4TxInfoByHash + this.reqNum4TxByPolicy;
      this.curTs = Date.now();
      if (0 === this.firstReqTs) {
        this.firstReqTs = this.curTs;
      }
      this.logUtilSrv.logInfo("IndexApiSyncClient...query_txs_by_address.....", this.curTs, this.reqNum4TxsByAddr);
      this.logUtilSrv.logInfo("IndexApiSyncClient...query_txs_by_address.....", this.curTs - this.firstReqTs, this.totalReqNum);

      if (res.status === 200) {
        ret_data = ret_data.concat(res.data.data);
        cursor = res.data.next_cursor;
      }
      if (!cursor) {
        break;
      }
    };

    return ret_data;
  }

  async query_txinfo_by_hash(txhash) {
    let url = `transactions/${txhash}`;
    let res = await this.axios_instance.get(url);
    this.logUtilSrv.logInfo("IndexApiSyncClient", "...query_txinfo_by_hash.....", url);

    this.reqNum4TxInfoByHash++;
    this.totalReqNum = this.reqNum4GetBlock + this.reqNum4TxsByAddr + this.reqNum4TxInfoByHash + this.reqNum4TxByPolicy;
    this.curTs = Date.now();
    if (0 === this.firstReqTs) {
      this.firstReqTs = this.curTs;
    }
    this.logUtilSrv.logInfo("IndexApiSyncClient...query_txinfo_by_hash.....", this.curTs, this.reqNum4TxInfoByHash);
    this.logUtilSrv.logInfo("IndexApiSyncClient...query_txinfo_by_hash.....", this.curTs - this.firstReqTs, this.totalReqNum);

    if (res.status !== 200) {
      return null;
    }

    return res.data.data;
  }

  async query_txs_by_policy(policy, fromSlot, toSlot = undefined) {
    if (toSlot === undefined) {
      toSlot = fromSlot;
    }

    let ret_data = [];
    let cursor = null;
    while (1) {
      let url = `policy/${policy}/mints?count=100&order=asc&&from=${fromSlot}&&to=${toSlot}`;
      if (cursor) {
        url = `${url}&&cursor=${cursor}`;
        cursor = null;
      }
      let res = await this.axios_instance.get(url);
      this.logUtilSrv.logInfo("IndexApiSyncClient", "...query_txs_by_policy.....", url);

      this.reqNum4TxByPolicy++;
      this.totalReqNum = this.reqNum4GetBlock + this.reqNum4TxsByAddr + this.reqNum4TxInfoByHash + this.reqNum4TxByPolicy;
      this.curTs = Date.now();
      if (0 === this.firstReqTs) {
        this.firstReqTs = this.curTs;
      }
      this.logUtilSrv.logInfo("IndexApiSyncClient...query_txs_by_policy.....", this.curTs, this.reqNum4TxByPolicy);
      this.logUtilSrv.logInfo("IndexApiSyncClient...query_txs_by_policy.....", this.curTs - this.firstReqTs, this.totalReqNum);

      if (res.status === 200) {
        ret_data = ret_data.concat(res.data.data);
        cursor = res.data.next_cursor;
      }
      if (!cursor) {
        break;
      }
    };

    return ret_data;
  }
}

module.exports = IndexApiSyncClient;
