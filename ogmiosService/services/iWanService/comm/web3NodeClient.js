'use strict';

const Web3 = require('web3');
const Web3Admin = require('comm/web3Admin.js');
const BaseNodeClient = require('comm/baseNodeClient.js');
const {
  markRpcErrorStatus,
} = require('comm/lib/error');

class Web3NodeClient extends BaseNodeClient {
  static newHttpProvider(nodeRpc, options) {
    let timeoutMs = this.DEFAULT_TIMEOUT_CREATE_RPC;
    let keepAlive = false;
    let provider = new Web3.providers.HttpProvider(nodeRpc.url, {timeout:timeoutMs, keepAlive: keepAlive});
    return provider;
  }
  static async newClient(log, nodeRpc, options) {
    let chainType = options && options.chainType;
    let client;
    try {
      client = new Web3(this.newHttpProvider(nodeRpc, options));
    } catch (err) {
      log.error("new client for", chainType, "error:", err, nodeRpc.url, nodeRpc.status());
      markRpcErrorStatus(log, nodeRpc, "create rpc client failed");
      throw new Error(`failed to create "${chainType}" chain rpc client`);
    }
    Web3Admin.extend(client);
    return client;
  }

}

module.exports = Web3NodeClient;
