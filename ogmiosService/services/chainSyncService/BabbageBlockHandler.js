const { parseMetadata, decodeMetadata2Json } = require("../utilService/commonUtils");

class BabbageBlockHandler {
  constructor(mapUtxoManager, bSecurityConfirmEnable, iWanClientObj) {
    this.chainType = "ADA";
    this.blockType = "babbage";

    this.treasuryUtxoMgr = mapUtxoManager.get("NonNFT");
    this.nftTreasuryUtxoMgr = mapUtxoManager.get("NFT");

    this.iWanClientInst = iWanClientObj;
    this.mapChainID2Info = new Map();
    this.cardanoChainId = undefined;

    this.bSecurityConfirmedByDefault = false;
    if (false === bSecurityConfirmEnable) {
      this.bSecurityConfirmedByDefault = true
    }
  }

  async getTokenPairInfoById(tokenPairId) {
    let tokenPairInfo = undefined;
    try {
      tokenPairInfo = await this.iWanClientInst.getTokenPairInfo(tokenPairId);
      console.log("tokenPair Info: ", tokenPairInfo);

    } catch (err) {
      console.log("getTokenPairInfoById failed: ", err);
      return undefined;
    }
    return tokenPairInfo;
  }

  async getSupportedChainInfo() {
    try {
      let supportedChainInfoArys = await this.iWanClientInst.getSupportedChainInfo();
      if (undefined === supportedChainInfoArys) {
        return undefined;
      }

      // console.log("supported ChainI nfo: ", supportedChainInfoArys);
      for (let i = 0; i < supportedChainInfoArys.length; i++) {
        let tmpChainID = supportedChainInfoArys[i].chainID;
        let tmpChainSymbol = supportedChainInfoArys[i].chainSymbol;
        if ('ADA' === tmpChainSymbol) {
          this.cardanoChainId = tmpChainID;
        }

        let chainAddressPrex = "0x";
        let crossScAddr = supportedChainInfoArys[i].crossScAddr;
        let multicallAddr = supportedChainInfoArys[i].multicallAddr;
        if ((undefined === multicallAddr) || (undefined === crossScAddr)) {
          chainAddressPrex = "";

        } else {
          let prexIndex = multicallAddr.indexOf("0x");
          if (-1 === prexIndex) {
            chainAddressPrex = "";
          }
        }

        let chainInfo = {
          "chainSymbol": tmpChainSymbol,
          "chainID": tmpChainID,
          "addressPrex": chainAddressPrex
        }
        this.mapChainID2Info.set(tmpChainID, chainInfo);

      }

      return supportedChainInfoArys;

    } catch (err) {
      console.log(err);
      return undefined;
    }
  }

  async parseAddressPrefix(tokenPairId) {
    let tokenPairInfo = await this.getTokenPairInfoById(tokenPairId);
    if (tokenPairInfo === ret) {
      return undefined;
    }

    // let fromChainID = tokenPairInfo.fromChainID;
    let targetChainID = tokenPairInfo.toChainID;
    if (this.cardanoChainId === tokenPairInfo.toChainID) {
      // if to chain is cardano, then to check from chainID
      targetChainID = tokenPairInfo.fromChainID;
    }

    let ret = await this.getSupportedChainInfo();
    if (undefined === ret) {
      return undefined;
    }
    let chainInfo = await this.mapChainID2Info.get(targetChainID);
    let addressPrex = chainInfo.addressPrex;

    return addressPrex;
  }

  //scan block backward nomally
  async processBlock(block, mapDbNameInst) {

    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");

    console.log("\n......rollForward babbage block:", block);
    let chainFilter = {
      "chainType": this.chainType
    }
    let syncedBlocks = await syncedInfoDbObj.findByOption(chainFilter);
    let latestBlockTs = syncedBlocks[0].time;
    let latestBlockSlot = syncedBlocks[0].slot;

    let blockInfo = block.babbage;
    let deltaTime = blockInfo.header.slot - latestBlockSlot;
    let curBlockTimeStamp = latestBlockTs + deltaTime;
    // console.log("curBlockTimeStamp:", curBlockTimeStamp);

    let blockTxs = await this.updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);

    await this.updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst);

    await this.updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);
  }

  async updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {
    let txInfoDbObj = mapDbNameInst.get("txInfo");
    let mintInfoDbObj = mapDbNameInst.get("mintInfo");

    console.log("\n\n*****non-NFT treasuryScAddress: ", this.treasuryUtxoMgr.treasuryScAddress);
    console.log("\n\n*****NFT treasuryScAddress: ", this.nftTreasuryUtxoMgr.treasuryScAddress);

    let blockTxs = new Array();
    for (let index = 0; index < blockInfo.body.length; index++) {
      let bTreasuryRelateTx = false;
      let bNftTreasuryRelateTx = false;

      const tx = blockInfo.body[index];
      console.log('\n\n .........[tx]:  ', tx);
      const txRedeemers = tx.witness.redeemers;
      console.log('\n\n .........tx redeemers:  ', txRedeemers);
      const txDatums = tx.witness.datums;
      console.log('\n\n .........tx datums:  ', txDatums);

      // to formate the input objects
      let formatedInputs = new Array();
      const txInputs = tx.body.inputs;
      console.log('\n\n .........[txInputs]:  ', txInputs);
      for (let j = 0; j < txInputs.length; j++) {
        let txHash = txInputs[j].txId;
        let txIndex = txInputs[j].index;
        let owner = this.treasuryUtxoMgr.getUtxoOwner(txHash, txIndex);
        if ("" === owner) {
          owner = this.nftTreasuryUtxoMgr.getUtxoOwner(txHash, txIndex);
        }

        let input = {
          "tx_hash": txHash,
          "tx_index": txIndex,
          "utxo_owner": owner
        }
        formatedInputs.push(input);

        if (("" !== owner) && ("inputs" === tx.inputSource)) {
          console.log('\n\n .........getUtxoOwner:  ', owner);
          if (this.treasuryUtxoMgr.treasuryScAddress === owner) {
            bTreasuryRelateTx = true;
            await this.treasuryUtxoMgr.consumeUtxo(txHash, txIndex);

          } else if (this.nftTreasuryUtxoMgr.treasuryScAddress === owner) {
            bNftTreasuryRelateTx = true;
            await this.nftTreasuryUtxoMgr.consumeUtxo(txHash, txIndex);
          }
        }
      }

      let collateralInputs = new Array();
      const collaterals = tx.body.collaterals;
      console.log('\n\n .........[collaterals]:  ', collaterals);
      if (collaterals) {
        for (let j = 0; j < collaterals.length; j++) {
          let txHash = collaterals[j].txId;
          let txIndex = collaterals[j].index;
          let owner = this.treasuryUtxoMgr.getUtxoOwner(txHash, txIndex);
          if ("" === owner) {
            owner = this.nftTreasuryUtxoMgr.getUtxoOwner(txHash, txIndex);
          }

          let input = {
            "tx_hash": txHash,
            "tx_index": txIndex,
            "utxo_owner": owner
          }
          collateralInputs.push(input);

          if (("" !== owner) && ("collaterals" === tx.inputSource)) {
            console.log('\n\n .........getUtxoOwner:  ', owner);
            if (this.treasuryUtxoMgr.treasuryScAddress === owner) {
              bTreasuryRelateTx = true;
              console.log('\n\n .........collateral getUtxoOwner:  ', owner);
              await this.treasuryUtxoMgr.consumeUtxo(txHash, txIndex);

            } else if (this.nftTreasuryUtxoMgr.treasuryScAddress === owner) {
              bNftTreasuryRelateTx = true;
              console.log('\n\n .........collateral getUtxoOwner:  ', owner);
              await this.nftTreasuryUtxoMgr.consumeUtxo(txHash, txIndex);
            }
          }
        }
      }

      // to formate the output objects
      let formatedOutputs = new Array();
      const txOutputs = tx.body.outputs;
      console.log('\n\n .........[txOutputs]:  ', txOutputs);
      for (let i = 0; i < txOutputs.length; i++) {
        // step 1: to parse the value
        let utxoValue = txOutputs[i].value;

        if (this.treasuryUtxoMgr.treasuryScAddress === txOutputs[i].address) {
          bTreasuryRelateTx = true;
          await this.treasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
            blockInfo.header.blockHeight, blockInfo.header.slot);
        }
        if (this.nftTreasuryUtxoMgr.treasuryScAddress === txOutputs[i].address) {
          bNftTreasuryRelateTx = true;
          await this.nftTreasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
            blockInfo.header.blockHeight, blockInfo.header.slot);
        }

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

            // TODO: to parse output utxo's value if related to check token policyId
            let policyId_name = key.split(".");
            // to check output is treasury related
            if (this.treasuryUtxoMgr.checkTokenPolicyIds.includes(policyId_name[0])) {
              console.log('\n\n .........checkTokenPolicyIds includes:  ', policyId_name[0]);
              await this.treasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
                blockInfo.header.blockHeight, blockInfo.header.slot);
            } else {
              let nftCheckTokenPolicyIds = await this.nftTreasuryUtxoMgr.getCheckTokenPolicyIds();
              console.log('\n\n .........nft checkTokenPolicyIds :  ', nftCheckTokenPolicyIds);
              if (nftCheckTokenPolicyIds.includes(policyId_name[0])) {
                console.log('\n\n .........nft checkTokenPolicyIds includes:  ', policyId_name[0]);
                await this.nftTreasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
                  blockInfo.header.blockHeight, blockInfo.header.slot);
              }
            }
          }
        }

        let formatedOutput = {
          "address": txOutputs[i].address,
          "amount": amounts,
          "datum": txOutputs[i].datum,
          "datumHash": txOutputs[i].datumHash
        }
        formatedOutputs.push(formatedOutput);
      }

      if (tx.body.collateralReturn) {
        console.log('\n\n ...tx...collateral Return: ', tx.body.collateralReturn);
        let collateralValue = tx.body.collateralReturn.value;
        let collateralAmounts = new Array();
        let adaAmountObj = {
          "unit": "lovelace",
          "quantity": collateralValue.coins.toString()
        }
        collateralAmounts.push(adaAmountObj);

        if (this.treasuryUtxoMgr.treasuryScAddress === tx.body.collateralReturn.address) {
          bTreasuryRelateTx = true;
          await this.treasuryUtxoMgr.addUtxo(tx.body.collateralReturn.address, tx.id, formatedOutputs.length,
            blockInfo.header.blockHeight, blockInfo.header.slot);
        } else if (this.nftTreasuryUtxoMgr.treasuryScAddress === tx.body.collateralReturn.address) {
          bNftTreasuryRelateTx = true;
          await this.nftTreasuryUtxoMgr.addUtxo(tx.body.collateralReturn.address, tx.id, formatedOutputs.length,
            blockInfo.header.blockHeight, blockInfo.header.slot);
        }

        if (collateralValue.assets) {
          for (let key in collateralValue.assets) {
            let value = collateralValue.assets[key];
            let assetAmountObj = {
              "unit": key,
              "quantity": value.toString()
            }
            // console.log("formate asset amount: ", assetAmountObj);
            collateralAmounts.push(assetAmountObj);

            // to check output token policyId is related to check token
            let policyId_name = key.split(".");
            if (this.treasuryUtxoMgr.checkTokenPolicyIds.includes(policyId_name[0])) {
              console.log('\n\n .........collateral checkTokenPolicyIds includes:  ', policyId_name[0]);
              await this.treasuryUtxoMgr.addUtxo(tx.body.collateralReturn.address, tx.id, formatedOutputs.length,
                blockInfo.header.blockHeight, blockInfo.header.slot);

            } else {
              let nftCheckTokenPolicyIds = await this.nftTreasuryUtxoMgr.getCheckTokenPolicyIds();
              if (nftCheckTokenPolicyIds.includes(policyId_name[0])) {
                console.log('\n\n .........collateral checkTokenPolicyIds includes:  ', policyId_name[0]);
                await this.nftTreasuryUtxoMgr.addUtxo(tx.body.collateralReturn.address, tx.id, formatedOutputs.length,
                  blockInfo.header.blockHeight, blockInfo.header.slot);
              }
            }
          }
        }

        let collateralOutput = {
          "address": tx.body.collateralReturn.address,
          "amount": collateralAmounts,
          "datum": tx.body.collateralReturn.datum,
          "datumHash": tx.body.collateralReturn.datumHash
        }
        formatedOutputs.push(collateralOutput);
      }

      // test 
      let txScriptHash = tx.body.scriptIntegrityHash;
      console.log("...test...txScriptHash: ", txScriptHash);

      let mintInfoAry = new Array();
      let txMint = tx.body.mint;
      if (undefined !== txMint) {
        console.log("...test...tx  mintCoin: ", txMint.coins, txMint.assets);

        let mintCoin = txMint.coins;
        if (parseInt(mintCoin) > 0) {
          let mintItem = {
            "unit": "lovelace",
            "amount": parseInt(mintCoin)
          }
          mintInfoAry.push(mintItem);
        }

        let assets = txMint.assets;
        for (let unit in assets) {
          //let policyId = unit.slice(0, 56);
          //let name = unit.slice(57);
          let amount = assets[unit];

          let mintItem = {
            "unit": unit,
            "amount": parseInt(amount)
          }
          mintInfoAry.push(mintItem);

          // to record mint info in mintInfo db table	
          let mintInfo = {
            "tokenId": unit,
            "txId": tx.id,
            "mintValue": parseInt(amount),
            "blockHeight": blockInfo.header.blockHeight,
            "slot": blockInfo.header.slot,
            "security_Confirmed": this.bSecurityConfirmedByDefault // need to security check by external resource 
          }

          let filter = {
            "tokenId": unit,
            "txId": tx.id,
          }
          let ret = await mintInfoDbObj.findByOption(filter);
          if (ret.length > 0) {
            await mintInfoDbObj.deleteByOption(filter);
          }

          await mintInfoDbObj.insert(mintInfo);
          console.log('insert babbage tx min record:  ', mintInfo);
        }
      }

      // to formate the tx meta data
      let formatedMetaData = undefined;
      if (tx.metadata) {
        let metaHash = tx.metadata.hash;
        let metaData = tx.metadata.body.blob;

        let metaDataArray = new Array();
        for (let key in metaData) {
          let jsonMetaData = decodeMetadata2Json(metaData[key]); //parseMetadata
          let metaDataInfo = {
            "label": key,
            "json_metadata": jsonMetaData
          }
          metaDataArray.push(metaDataInfo);
        }

        formatedMetaData = {
          "hash": metaHash,
          "metaData": metaDataArray
        }
      }
      console.log('[txMetaData]: ', formatedMetaData);

      // to get the validityInterval of tx
      let valInteral = tx.body.validityInterval;
      let txTtl = {
        "invalidBefore": (undefined === valInteral) ? null : valInteral.invalidBefore,
        "invalidHereafter": (undefined === valInteral) ? null : valInteral.invalidHereafter,
      };

      let txInfo = {
        "txId": tx.id,
        "blockHeight": blockInfo.header.blockHeight,
        "blockHash": blockInfo.header.blockHash,
        "slot": blockInfo.header.slot,
        "txIndex": index,
        "time": curBlockTimeStamp,
        "metaData": formatedMetaData,
        "collaterals": collateralInputs,
        "inputs": formatedInputs,
        "outputs": formatedOutputs,
        "validityInterval": txTtl,
        "mint": mintInfoAry,
        "redeemers": txRedeemers,
        "datums": txDatums,
        "fee": tx.body.fee,
        "inputSource": tx.inputSource
      }
      // console.log('txInfo:  ', txInfo);

      let filter = {
        "txId": tx.id
      }
      let ret = await txInfoDbObj.findByOption(filter);
      if (ret.length > 0) {
        await txInfoDbObj.deleteByOption(filter);
      }

      // console.log('begin to insert babbage tx:  ', txInfo);
      await txInfoDbObj.insert(txInfo);
      console.log('insert babbage tx:  ', txInfo);

      let txObj = {
        "tx_hash": tx.id,
        "tx_index": index,  // index in the block
        "treasury_related": bTreasuryRelateTx,
        "nftTreasury_related": bNftTreasuryRelateTx,
        "security_Confirmed": this.bSecurityConfirmedByDefault // need to security check by external resource
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
    // console.log('babbage blockInfo:  ', syncedBlockInfo);
    await blockInfoDbObj.insert(syncedBlockInfo);
    console.log('[sync new babbage block]', syncedBlockInfo);
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

    console.log('[sync new babbage block]', syncedData);
  }
}

module.exports = BabbageBlockHandler;
