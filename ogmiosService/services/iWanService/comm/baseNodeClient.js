'use strict';

const {
  doWait,
} = require('comm/lib/common');
const Config = require('conf/config');

class BaseNodeClient {
  static HIDE_RPC = false;
  static DEFAULT_AUTO_SWITCH_RPC = false;
  static DEFAULT_DURATION_SWITCH_RPC = global.dev ? 5000 : 20000; // 20 s
  static DEFAULT_TIMEOUT_CREATE_RPC = global.dev ? 30000 : 10000; // 10 s
  static genEventListenFunc(log, nodeRpc, chainType, func) {
    return func.bind({log, nodeRpc, chainType});
  }
  static sleep(time) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve();
      }, time);
    })
  }

  static newClient(log, nodeRpc, options) {
    return null;
  }

  static async loadNodeClient(nodeClient, nodeRpc, options) {
    // const {needUpdate, chainType} = options;
    nodeClient.client = await doWait(nodeClient.constructor.newClient(nodeClient.log, nodeRpc, options));
    nodeClient.nodeRpc = nodeRpc;
  }

  static async newClientBefore(nodeClient, needUpdate) {
    if (needUpdate && nodeClient && nodeClient.client) {
      return await doWait(nodeClient.disconnect());
    }
  }

  static async newClientAfter(nodeClient, needUpdate) {
    return await doWait(nodeClient.connect());
  }

  static async selectNodeRpc(nodeRpcManager, log) {
    return await doWait(nodeRpcManager.apiRpcManager.getRpcByFewerError(log));
  }

  constructor(log, chainType, refreshNodeRpcManagers, options) {
    try {
      options = Object.assign({}, {
        autoSwitchRpc:this.constructor.DEFAULT_AUTO_SWITCH_RPC,
        durationSwitchRpc:this.constructor.DEFAULT_DURATION_SWITCH_RPC,
      }, options);

      this.log = log;
      this.chainType = chainType;
      this.client = null;
      this.nodeRpc = null;
      this.refreshNodeRpcManagers = refreshNodeRpcManagers;
      this.network = Config.network;
      this.hideUrl = this.constructor.HIDE_RPC;
      this.durationSwitchRpc = options.durationSwitchRpc;

      if (options.autoSwitchRpc) {
        this.log.info(this.chainType, "enableAutoSwitchRpc", new Date())
        this.enableAutoSwitchRpc();
      }
    } catch (error) {
      log.error(log.__line(), ":", error);
    }
  }

  async loadRpc(options) {
    let update = false;

    options = Object.assign({}, {hideUrl: this.hideUrl}, options);

    let nodeRpcManagerDict = await this.refreshNodeRpcManagers();
    if (
      !nodeRpcManagerDict || !nodeRpcManagerDict[this.chainType]
      || !nodeRpcManagerDict[this.chainType].apiRpcManager || nodeRpcManagerDict[this.chainType].apiRpcManager.empty()
    ) {
      throw new Error(`not found RPC of chain "${this.chainType}"`);
    }

    let nodeRpc = await this.constructor.selectNodeRpc(nodeRpcManagerDict[this.chainType], this.log);
    if (!this.nodeRpc || this.nodeRpc.url != nodeRpc.url || this.nodeRpc.apiKey != nodeRpc.apiKey) {
      // this.nodeRpc = nodeRpc;
      update = true;
    }
    // console.log("this.nodeRpc:", this.nodeRpc)
    if (!options.hideUrl) {
      this.log.info(this.chainType + ' node client url: ' + nodeRpc.url);
    }
    return {update, nodeRpc, isLongLived:nodeRpcManagerDict[this.chainType].apiRpcManager.isLongLived};
  }

  async init(options) {
    if (typeof(options) !== "object" || !options) {
      options = {};
    }

    const {update:needUpdate, nodeRpc, isLongLived} = await this.loadRpc(options);
    if (!isLongLived && this.autoSwitchRpcInterval) {
      this.disableAutoSwtichRpc();
    } else if (isLongLived && !this.autoSwitchRpcInterval) {
      this.enableAutoSwitchRpc();
    }

    if (needUpdate || !this.client) {
      await doWait(this.constructor.newClientBefore(this, needUpdate));
      await this.constructor.loadNodeClient(this, nodeRpc, {needUpdate, chainType: this.chainType, ...options});
      // this.client = await doWait(this.constructor.newClient(this, nodeRpc, {needUpdate, chainType: this.chainType, ...options}));
      await doWait(this.constructor.newClientAfter(this, needUpdate));
    }
  }
  connect() {}

  disconnect() {
    // console.log(this.chainType, "base node client disconnect")
    this.client = null;
    this.nodeRpc = null;
  }
  async isConnected() {
    return false;
  }

  setClient(client, nodeRpc) {
    this.client = client;
    this.nodeRpc = nodeRpc;
  }

  async getClient(options, callback) {
    try {
      if (typeof(callback) === "function") {
        callback = options;
        options = {};
      }
      await this.init(options);
      return typeof(callback) === "function" ? callback(undefined, this.client) : this.client;
    } catch (err) {
      if (typeof(callback) === "function") {
        return callback(err)
      } 
      throw err;
    }
  }

  enableAutoSwitchRpc() {
    if (!this.autoSwitchRpcInterval) {
      // console.log(this.chainType, "enableAutoSwitchRpc running", new Date())
      this.autoSwitchRpcInterval = setInterval(async () => {
        // console.log(this.chainType, "auto switch rpc  running", new Date())
        await this.init().catch(err => this.log.error(`auto switch "${this.chainType}" error:`, err));
      }, this.durationSwitchRpc);
    }
  }

  disableAutoSwtichRpc() {
    if (this.autoSwitchRpcInterval) {
      // console.log(this.chainType, "enableAutoSwitchRpc stopped")
      clearInterval(this.autoSwitchRpcInterval);
      this.autoSwitchRpcInterval = null;
    }
  }

  async getAllClients(options, callback) {
    let clients = [];

    if (typeof(options) === "function") {
      callback = options;
      options = {}
    }
    options = Object.assign({}, {}, options);

    let nodeRpcManagerDict = await this.refreshNodeRpcManagers();
    if (nodeRpcManagerDict[this.chainType].apiRpcManager.length > 1) {
      const nodeRpcs = nodeRpcManagerDict[this.chainType].apiRpcManager.rpcs();
      for (const nodeRpc of nodeRpcs) {
        options.apiKey = nodeRpc.apiKey;
        // await this.constructor.newClientBefore(this, needUpdate);
        // this.client = this.constructor.newClient(this.log, this.nodeRpc, {needUpdate, ...options});
        clients.push(await this.constructor.newClient(this.log, nodeRpc, {needUpdate: true, chainType: this.chainType, ...options}));
        // await this.constructor.newClientAfter(this, needUpdate);
      }
    } else {
      await this.getClient();
      clients.push(this.client);
    }
    return callback(undefined, clients);
  }
}
module.exports = BaseNodeClient;
