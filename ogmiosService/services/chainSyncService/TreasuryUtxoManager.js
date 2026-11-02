
const {
  createInteractionContext
} = require('@cardano-ogmios/client');

const UtxoStatus_Available = 1;
const UtxoStatus_Consumed = 0;


class TreasuryUtxoManager {

  constructor(treasuryAddress, mapDbNameInst, checkTokenPolicyIdCfg) {

    this.treasuryScAddress = treasuryAddress;
    this.checkTokenPolicyIds = checkTokenPolicyIdCfg;
    this.treasuryUtxoDbInst = mapDbNameInst.get("treasuryUtxoInfo");
    this.mapAvailalbeUtxos = new Map();
  }

  //scan block backward nomally
  async init() {

    try {

      let filter = {
        "owner": this.treasuryScAddress,
        "status": UtxoStatus_Available
      }
      let utxoObjs = await this.treasuryUtxoDbInst.findAllByOption(filter);

      for (let i = 0; i < utxoObjs.length; i++) {
        let utxoItem = utxoObjs[i];
        this.mapAvailalbeUtxos.set(utxoItem.utxoId, utxoItem);
      }

      return true;

    } catch (e) {
      console.log("query utxo exception: ", e);
      return false;
    }

  }

  async addUtxo(scAddress, txId, txIndex, blockHeight, slot) {
    let utxoId = txId + "." + txIndex;//encodeUtxo(utxoObj);
    let utxoItem = {
      "utxoId": utxoId,
      "txId": txId,
      "txIndex": txIndex,
      "blockHeight": blockHeight,
      "slot": slot,
      "owner": scAddress,
      "status": UtxoStatus_Available
    }

    let filter = {
      "utxoId": utxoId
    }
    let ret = await this.treasuryUtxoDbInst.findByOption(filter);
    if (ret.length > 0) {
      await this.treasuryUtxoDbInst.deleteByOption(filter);
    }
    await this.treasuryUtxoDbInst.insert(utxoItem);

    this.mapAvailalbeUtxos.set(utxoId, utxoItem);
  }

  getUtxoOwner(txId, txIndex) {
    let utxoId = txId + "." + txIndex;
    let utxoItem = this.mapAvailalbeUtxos.get(utxoId);
    // if (undefined === utxoItem) {
    //   // let filter = {
    //   //   "utxoId": utxoId
    //   // };
    //   // let utxoObjs = await this.treasuryUtxoDbInst.findByOption(filter);
    //   // utxoItem = utxoObjs[0];
    // }
    let owner = (undefined === utxoItem) ? "" : utxoItem.owner;
    return owner;
  }

  async consumeUtxo(txId, txIndex) {
    let utxoId = txId + "." + txIndex;
    // update utxo status to comsumed
    let filter = {
      "utxoId": utxoId
    };
    let updatedData = {
      $set: {
        "status": UtxoStatus_Consumed
      }
    }
    await this.treasuryUtxoDbInst.updateByOption(filter, updatedData);

    let utxoItem = this.mapAvailalbeUtxos.get(utxoId);
    if (undefined !== utxoItem) {
      this.mapAvailalbeUtxos.delete(utxoId);
    }

  }

  async getCheckTokenPolicyIds() {

    return this.checkTokenPolicyIds;
  }

}

module.exports = TreasuryUtxoManager;
