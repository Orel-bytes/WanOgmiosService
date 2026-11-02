const { decodeMetadata2Json } = require("../utilService/commonUtils");

class ShellyBlockHandler {
  constructor() {
    this.chainType = "ADA";
    this.blockType = "shelley";
    this.bFirstShellyBlock = true;
    this.byronBlockTimeNap = 20;
  }

  //scan block backward nomally
  async processBlock(block, mapDbNameInst) {
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");

    console.log("\n......rollForward shelley block:", block);
    let chainFilter = {
      "chainType": this.chainType
    }
    let syncedBlocks = await syncedInfoDbObj.findByOption(chainFilter);
    let latestBlockTs = syncedBlocks[0].time;
    let latestBlockSlot = syncedBlocks[0].slot;

    let blockInfo = block.shelley;
    let deltaTime = blockInfo.header.slot - latestBlockSlot;
    if (this.bFirstShellyBlock) {
      deltaTime = deltaTime * this.byronBlockTimeNap;
      this.bFirstShellyBlock = false;
    }
    let curBlockTimeStamp = latestBlockTs + deltaTime;
    // console.log("curBlockTimeStamp:", curBlockTimeStamp);

    let blockTxs = await this.updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);

    await this.updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst);

    await this.updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);
  }

  async updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {
    let txInfoDbObj = mapDbNameInst.get("txInfo");

    let blockTxs = new Array();
    for (let index = 0; index < blockInfo.body.length; index++) {
      const tx = blockInfo.body[index];
      console.log('\n\n .........[tx]:  ', tx);
      let txSender = undefined;

      // to formate the input objects
      let formatedInputs = new Array();
      const txInputs = tx.body.inputs;
      for (let j = 0; j < txInputs.length; j++) {
        let txHash = txInputs[j].txId;
        let txIndex = txInputs[j].index;

        let input = {
          "tx_hash": txHash,
          "tx_index": txIndex,
        }
        formatedInputs.push(input);
      }

      // to formate the output objects
      let formatedOutputs = new Array();
      const txOutputs = tx.body.outputs;
      for (let i = 0; i < txOutputs.length; i++) {
        let utxoValue = txOutputs[i].value;

        let amounts = new Array();
        let adaAmountObj = {
          "unit": "lovelace",
          "quantity": utxoValue.coins.toString()
        }
        amounts.push(adaAmountObj);

        if (utxoValue.assets) {
          for (let key in utxoValue.assets) {
            let value = utxoValue.assets[key];
            let assetAmountObj = {
              "unit": key,
              "quantity": value.toString()
            }
            // console.log("formate asset amount: ", assetAmountObj);
            amounts.push(assetAmountObj);
          }
        }

        let formatedOutput = {
          "address": txOutputs[i].address,
          "amount": amounts
        }
        formatedOutputs.push(formatedOutput);
      }

      // to formate the tx meta data
      let formatedMetaData = undefined;
      if (tx.metadata) {
        let metaDataArray = new Array();
        let metaHash = tx.metadata.hash;
        let metaData = tx.metadata.body.blob;

        for (let key in metaData) {
          let jsonMetaData = decodeMetadata2Json(metaData[key]);
          let metaDataInfo = {
            "label": key,
            "json_metadata": jsonMetaData
          }
          console.log("formate metaDataInfo: ", metaDataInfo);
          metaDataArray.push(metaDataInfo);
        }

        formatedMetaData = {
          "hash": metaHash,
          "metaData": metaDataArray
        }
      }
      console.log('[txMetaData]: ', formatedMetaData);

      let txInfo = {
        "txId": tx.id,
        "blockHeight": blockInfo.header.blockHeight,
        "txIndex": index,
        "time": curBlockTimeStamp,
        "metaData": formatedMetaData,
        "inputs": formatedInputs,
        "outputs": formatedOutputs
      }
      await txInfoDbObj.insert(txInfo);
      console.log('insert shelley tx:  ', txInfo);

      let txObj = {
        "tx_hash": tx.id,
        "tx_index": index  // index in the block
      }
      blockTxs.push(txObj);
    }

    return blockTxs;
  }

  async updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst) {
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");

    let syncedBlockInfo = {
      "blockHeight": blockInfo.header.blockHeight,
      "blockHash": blockInfo.header.blockHash,
      "slot": blockInfo.header.slot,
      "hash": blockInfo.headerHash,
      "time": curBlockTimeStamp,
      "blockType": this.blockType,
      "blockTxs": blockTxs
    }

    let filter = {
      "blockHeight": blockInfo.header.blockHeight
    }
    let ret = await blockInfoDbObj.findByOption(filter);
    if (ret.length > 0) {
      await blockInfoDbObj.deleteByOption(filter);
    }
    // console.log('shelley blockInfo:  ', syncedBlockInfo);
    await blockInfoDbObj.insert(syncedBlockInfo);

    console.log('[sync new shelley block]', syncedBlockInfo);
  }

  async updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {

    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");

    let syncedData = {
      $set: {
        "blockHeight": blockInfo.header.blockHeight,
        "time": curBlockTimeStamp,
        "slot": blockInfo.header.slot,
        "hash": blockInfo.headerHash
      }
    }

    let filter = {
      "chainType": this.chainType
    }
    await syncedInfoDbObj.updateByOption(filter, syncedData);

    console.log('[sync new shelley block]', syncedData);
  }

}

module.exports = ShellyBlockHandler;
