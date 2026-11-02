
const { parseMetadata } = require("../utilService/commonUtils");

class ByronBlockHandler {
  constructor() {
    this.chainType = "ADA";
    this.blockType = "byron";
    this.timeNap = 20;
  }


  //scan block backward nomally
  async processBlock(block, mapDbNameInst) {
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");

    // console.log("\n......rollForward:");
    let chainFilter = {
      "chainType": this.chainType
    }
    let syncedBlocks = await syncedInfoDbObj.findByOption(chainFilter);
    let latestBlockTs = syncedBlocks[0].time;
    let latestBlockSlot = syncedBlocks[0].slot;

    let blockInfo = block.byron;
    let deltaTime = (blockInfo.header.slot - latestBlockSlot) * this.timeNap;
    let curBlockTimeStamp = latestBlockTs + deltaTime;
    // console.log("curBlockTimeStamp:", curBlockTimeStamp);

    let blockTxs = await this.updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);

    await this.updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst);

    await this.updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);
  }

  async updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {
    let txInfoDbObj = mapDbNameInst.get("txInfo");

    let blockTxs = new Array();
    let txSender = undefined;

    const txPayload = blockInfo.body.txPayload;
    console.log('\n\n .........[txPayload]:  ', txPayload);
    for (let index = 0; index < txPayload.length; index++) {
      let txBody = txPayload[index].body;

      // to formate the input objects
      let formatedInputs = new Array();
      const txInputs = txBody.inputs;
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
      const txOutputs = txBody.outputs;
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

      let txInfo = {
        "txId": txPayload[index].id,
        "blockHeight": blockInfo.header.blockHeight,
        "txIndex": index,
        "time": curBlockTimeStamp,
        "metaData": undefined, // there is no meta data in byron block
        "inputs": formatedInputs,
        "outputs": formatedOutputs
      }
      await txInfoDbObj.insert(txInfo);
      console.log('insert byron tx:  ', txInfo);

      let txObj = {
        "tx_hash": txPayload[index].id,
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
      "blockHash": blockInfo.hash, // there is no block hash in byron block
      "slot": blockInfo.header.slot,
      "hash": blockInfo.hash,
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
    // console.log('byron blockInfo:  ', syncedBlockInfo);
    await blockInfoDbObj.insert(syncedBlockInfo);

    console.log('[sync new byron block]', syncedBlockInfo);
  }

  async updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {

    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");

    let syncedData = {
      $set: {
        "blockHeight": blockInfo.header.blockHeight,
        "time": curBlockTimeStamp,
        "slot": blockInfo.header.slot,
        "hash": blockInfo.hash
      }
    }

    let filter = {
      "chainType": this.chainType
    }
    await syncedInfoDbObj.updateByOption(filter, syncedData);

    console.log('[sync new byron block]', syncedData);
  }

}

module.exports = ByronBlockHandler;
