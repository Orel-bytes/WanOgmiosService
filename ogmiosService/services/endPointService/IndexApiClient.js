const axios = require('axios');

const {
  convertIndexApiUtxoToMaestro
} = require("../utilService/commonUtils");

class IndexApiClient {
  constructor(cfg) {
    this.maestroCfg = cfg;

    this.axios_instance = axios.create({
      baseURL: this.maestroCfg.url,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.maestroCfg.apiKey
      },
      timeout: 120000
    }
    );
  }

  async query_utxo_by_addresses(addressAry) {
    let req_data = addressAry;
    let ret_data = [];
    let cursor = null;

    while (1) {
      let url = 'addresses/utxos?count=100';
      if (cursor) {
        url = `${url}&&cursor=${cursor}`;
        cursor = null;
      }
      let res = await this.axios_instance.post(url, req_data);
      if (res.status === 200) {
        ret_data = ret_data.concat(res.data.data);
        cursor = res.data.next_cursor;
      }
      if (!cursor) {
        break;
      }
    };

    let utxos = [];
    for (let idx = 0; idx < ret_data.length; ++idx) {
      let utxo = convertIndexApiUtxoToMaestro(ret_data[idx]);
      utxos.push(utxo);
    }

    return utxos;
  }

  async query_utxo_by_output_reference(txhash, index) {
    let url = `/transactions/${txhash}/outputs/${index}/txo`;
    let res = await this.axios_instance.get(url);
    if (res.status !== 200) {
      return undefined;
    }

    let utxo = convertIndexApiUtxoToMaestro(res.data.data);
    return utxo;
  }

  async query_utxo_by_output_reference_ary(txInAry) {
    let utxos = [];

    for (let idx = 0; idx < txInAry.length; ++idx) {
      let txInItem = txInAry[idx];
      let utxo = await this.query_utxo_by_output_reference(txInItem.transaction.id, txInItem.index);
      if (undefined === utxo) {
        return undefined;
      }

      utxos.push(utxo);
    }

    return utxos;
  }

  async eraSummaries() {
    let url = 'era-summaries';
    let res = await this.axios_instance.get(url);
    if (res.status === 200) {
      return res.data.data;
    } else {
      return [];
    }
  }

  async protocolParameters() {
    let url = 'protocol-parameters';
    let res = await this.axios_instance.get(url);
    if (res.status === 200) {
      return res.data.data;
    } else {
      return undefined;
    }
  }

  async chainTip() {
    let url = 'chain-tip';
    let res = await this.axios_instance.get(url);
    if (res.status === 200) {
      return res.data.data;
    } else {
      return undefined;
    }
  }

  async networkBlockHeight() {
    let url = '/blocks/latest';
    let res = await this.axios_instance.get(url);
    // console.log("\n\n networkBlockHeight res: ", res);
    if (res.status === 200) {
      // console.log("\n\n networkBlockHeight res: ", res.data.data.height);
      return res.data.data.height;
    } else {
      return undefined;
    }
  }

  async evaluateTx(rawTx) {
    let url = '/transactions/evaluate';
    let payload = {
      cbor: rawTx
    };
    let res = await this.axios_instance.post(url, payload);
    if (res.status === 200) {
      return res.data;
    } else {
      return undefined;
    }
  }

  async submitTx(signedTx) {
    let url = '/txmanager';

    const data = Buffer.isBuffer(signedTx) ? signedTx : Buffer.from(signedTx.replace(/^0x/, ''), 'hex');
    console.log("\n\nsignedTx: ", data);
    let res = await this.axios_instance.post(url, data, {
      headers: {
        'Content-Type': 'application/cbor',
      }
    });

    console.log("\n\nsubmitTx res: ", res);
    if (res.status === 202) {
      console.log("\n\nsubmitTx: ", res.data);
      return res.data;
    } else {
      return undefined;
    }
  }

  async delegationsAndRewards(stakeAddr) {
    let url = `/accounts/${stakeAddr}/rewards`;

    let res = await this.axios_instance.get(url);
    if (res.status === 200) {
      console.log("\n\n delegationsAndRewards res: ", res.data.data);
      return res.data.data;
    } else {
      return undefined;
    }
  }

  async accountInfo(stakeAddr) {
    let url = `/accounts/${stakeAddr}`;
    let res = await this.axios_instance.get(url);
    if (res.status === 200) {
      console.log("\n\n accountInfo res: ", res.data.data);
      return res.data.data;
    } else {
      return undefined;
    }
  }

}

module.exports = IndexApiClient;
