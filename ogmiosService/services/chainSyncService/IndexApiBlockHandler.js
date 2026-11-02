const {
  convertRedeemers2Ogmios,
  convertIndexApiUtxoToMaestro,
  convertMaestroUtxoAmount,
  toSafeString
} = require("../utilService/commonUtils");
const BlockFrostAPI = require('@blockfrost/blockfrost-js').BlockFrostAPI;

class IndexApiBlockHandler {
  constructor(mapUtxoManager, bSecurityConfirmEnable, iWanService, mapServiceConfig, logUtil) {
    this.chainType = "ADA";

    this.logUtil = logUtil;

    this.msgTokenPolicyIds = mapServiceConfig.get("msgTokenPolicyIdCfg");
    this.tokenPolicyIds = mapServiceConfig.get("tokenPolicyIdCfg");
    this.blockFrostCfg = mapServiceConfig.get("blockFrostConfig");
    this.txMetaDataSource = mapServiceConfig.get("txMetaDataSource");

    this.treasuryUtxoMgr = mapUtxoManager.get("NonNFT");
    this.nftTreasuryUtxoMgr = mapUtxoManager.get("NFT");

    this.iWanService = iWanService;
    this.cardanoChainId = iWanService.cardanoChainID;

    this.mapChainID2Info = new Map();

    this.bSecurityConfirmedByDefault = false;
    if (false === bSecurityConfirmEnable) {
      this.bSecurityConfirmedByDefault = true
    }

    let blockfrostOption = {
      projectId: this.blockFrostCfg.ApiKey,
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

    this.chainAddressPrefixConfig = mapServiceConfig.get("chainAddressPrefixConfig");
    for (let i = 0; i < this.chainAddressPrefixConfig.length; i++) {
      let configItem = this.chainAddressPrefixConfig[i];
      if ('ADA' === configItem.chainType) {
        this.cardanoChainId = configItem.chainID;
      }

      let chainInfo = {
        "chainType": configItem.chainType,
        "chainID": configItem.chainID,
        "addressPrex": configItem.addressPrex
      }
      this.mapChainID2Info.set(configItem.chainID, chainInfo);
    }
  }

  async getMintNFTPolicyId(mapDbNameInst) {
    let policyIdDbInst = mapDbNameInst.get("mappingTokenPolicyIdConfig");
    if (undefined === policyIdDbInst) {
      return undefined;
    }

    let policyIdFilter = {
      "checkTokenType": 2 // 1: Non-NFT; 2: NFT
    };
    let ret = await policyIdDbInst.findByOption(policyIdFilter);
    if (undefined === ret) {
      console.log("PraosBlockHandler...nft policyId is failed to get...");
      return undefined;
    }

    if ((undefined === ret[0]) || (0 === ret[0].policyIds.length)) {
      console.log("PraosBlockHandler...nft policyIds is empty...");
      return [];
    }

    let nftPolicyIds = ret[0].policyIds;
    console.log("PraosBlockHandler...nft policyIds is: ", nftPolicyIds);
    return nftPolicyIds;
  }

  getTokenPairInfoById(tokenPairId) {
    this.logUtil.logInfo("IndexApiBlockHandler", "...getTokenPairInfoById from iWanService...tokenPairId...", tokenPairId);
    let tokenPairInfo = this.iWanService.getTokenPairById(tokenPairId);
    console.log("tokenPair Info: ", tokenPairInfo);
    this.logUtil.logInfo("IndexApiBlockHandler", "...getTokenPairInfoById from iWanService...tokenPairInfo...", tokenPairInfo);

    return tokenPairInfo;
  }

  parseAddressPrefix(tokenPairId) {
    let tokenPairInfo = this.getTokenPairInfoById(tokenPairId);
    if (undefined === tokenPairInfo) {
      return "";
    }

    // let fromChainID = tokenPairInfo.fromChainID;
    let targetChainID = tokenPairInfo.toChainID;
    if (this.cardanoChainId === tokenPairInfo.toChainID) {
      // if to chain is cardano, then to check from chainID
      targetChainID = tokenPairInfo.fromChainID;
    }

    let chainInfo = this.mapChainID2Info.get(targetChainID);
    this.logUtil.logInfo("IndexApiBlockHandler", "...parseAddressPrefix...chainInfo: ", chainInfo);
    if (undefined === chainInfo) {
      return "";
    }

    let addressPrex = chainInfo.addressPrex;
    this.logUtil.logInfo("IndexApiBlockHandler", "...parseAddressPrefix...addressPrex: ", addressPrex);
    return addressPrex;
  }

  //scan block backward nomally
  async processBlock(blockInfo, mapDbNameInst) {
    blockInfo.slot = blockInfo.absolute_slot;

    // console.log("\n\n*****non-NFT treasuryScAddress: ", this.treasuryUtxoMgr.treasuryScAddress);
    // console.log("\n\n*****NFT treasuryScAddress: ", this.nftTreasuryUtxoMgr.treasuryScAddress);

    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");

    // console.log("\n......rollForward IndexApi block:", blockInfo);
    let chainFilter = {
      "chainType": this.chainType
    }
    let syncedBlocks = await syncedInfoDbObj.findByOption(chainFilter);
    let latestBlockTs = syncedBlocks[0].time;
    let latestBlockSlot = syncedBlocks[0].slot;

    this.blockEra = blockInfo.era;
    let deltaTime = blockInfo.slot - latestBlockSlot;
    let curBlockTimeStamp = latestBlockTs + deltaTime;

    let blockTxs = await this.updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);

    await this.updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst);

    await this.updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst);
  }

  async updateTxsInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {
    let txInfoDbObj = mapDbNameInst.get("txInfo");
    let mintInfoDbObj = mapDbNameInst.get("mintInfo");

    let blockTxs = new Array();
    for (let index = 0; index < blockInfo.transactions.length; index++) {
      let bTreasuryRelateTx = false;
      let bNftTreasuryRelateTx = false;

      const tx = blockInfo.transactions[index];
      tx.id = tx.tx_hash;
      if (tx.scripts_successful === true) {
        tx.inputSource = "inputs"
      }
      else {
        tx.inputSource = "collaterals";
      }
      console.log('\n\n .........[tx]:  ', tx);

      const txRedeemers = convertRedeemers2Ogmios(tx.redeemers);
      console.log('\n\n .........tx redeemers:  ', txRedeemers);

      const txDatums = tx.datums;
      console.log('\n\n .........tx datums:  ', txDatums);

      // to formate the input objects
      let formatedInputs = new Array();
      const txInputs = tx.inputs;
      // console.log('\n\n .........[txInputs]:  ', txInputs);
      for (let j = 0; j < txInputs.length; j++) {
        let txHash = txInputs[j].tx_hash;
        let txIndex = txInputs[j].index;
        let owner = txInputs[j].address;

        let formatedUtxoObj = convertIndexApiUtxoToMaestro(txInputs[j]);
        let formatedAmounts = convertMaestroUtxoAmount(formatedUtxoObj.value);

        let input = {
          "tx_hash": txHash,
          "tx_index": txIndex,
          "utxo_owner": owner,
          "utxo_amount": formatedAmounts
        }
        formatedInputs.push(input);

        if (("" !== owner) && (true === tx.scripts_successful)) {
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
      const collaterals = tx.collateral_inputs;
      console.log('\n\n .........[collaterals]:  ', collaterals);
      if (collaterals) {
        for (let j = 0; j < collaterals.length; j++) {
          let txHash = collaterals[j].tx_hash;
          let txIndex = collaterals[j].index;
          let owner = collaterals[j].address;

          let formatedUtxoObj = convertIndexApiUtxoToMaestro(collaterals[j]);
          let formatedAmounts = convertMaestroUtxoAmount(formatedUtxoObj.value);

          let input = {
            "tx_hash": txHash,
            "tx_index": txIndex,
            "utxo_owner": owner,
            "utxo_amount": formatedAmounts
          }

          collateralInputs.push(input);

          if (("" !== owner) && (false === tx.scripts_successful)) {
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
      const txOutputs = tx.outputs;
      for (let i = 0; i < txOutputs.length; i++) {
        // step 1: to parse the value
        let assets = txOutputs[i].assets;

        if (this.treasuryUtxoMgr.treasuryScAddress === txOutputs[i].address) {
          bTreasuryRelateTx = true;
          await this.treasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.tx_hash, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }
        if (this.nftTreasuryUtxoMgr.treasuryScAddress === txOutputs[i].address) {
          bNftTreasuryRelateTx = true;
          await this.nftTreasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.tx_hash, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }

        let amounts = [];
        for (let idx_asset = 0; idx_asset < assets.length; idx_asset++) {
          let asset = assets[idx_asset];

          let am = {};
          if (asset.unit === "lovelace") {
            am.unit = "lovelace";
            am.quantity = asset.amount.toString();
            amounts.push(am);
          }
          else {
            let policyId = asset.unit.slice(0, 56)
            let asset_name = asset.unit.slice(56);
            am.unit = policyId + "." + asset_name;
            am.quantity = asset.amount.toString();
            amounts.push(am);

            if (this.treasuryUtxoMgr.checkTokenPolicyIds.includes(policyId)) {
              await this.treasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
                blockInfo.height, blockInfo.slot);
            } else {
              let nftCheckTokenPolicyIds = await this.nftTreasuryUtxoMgr.getCheckTokenPolicyIds();
              if (nftCheckTokenPolicyIds.includes(policyId)) {
                await this.nftTreasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
                  blockInfo.height, blockInfo.slot);
              }
            }
          }
        }

        let formatedOutput = {
          "address": txOutputs[i].address,
          "amount": amounts
        };
        if (txOutputs[i].datum) {
          if (txOutputs[i].datum.bytes) {
            formatedOutput.datum = txOutputs[i].datum.bytes
          };
          if (txOutputs[i].datum.hash) {
            formatedOutput.datumHash = txOutputs[i].datum.hash
          };
        }
        formatedOutputs.push(formatedOutput);
      }

      console.log("\n");
      // console.log("bTreasuryRelateTx:", bTreasuryRelateTx);
      console.log("formatedOutputs:", formatedOutputs);

      if (tx.collateral_return) {
        console.log('\n\n ...tx...collateral Return: ', tx.collateral_return);
        console.log('\n\n ...tx...collateral Return.assets: ', tx.collateral_return.assets);

        if (this.treasuryUtxoMgr.treasuryScAddress === tx.collateral_return.address) {
          bTreasuryRelateTx = true;
          await this.treasuryUtxoMgr.addUtxo(tx.collateral_return.address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);

        } else if (this.nftTreasuryUtxoMgr.treasuryScAddress === tx.collateral_return.address) {
          bNftTreasuryRelateTx = true;
          await this.nftTreasuryUtxoMgr.addUtxo(tx.collateral_return.address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }

        let collateralValue = tx.collateral_return.assets;
        console.log('\n\n ...tx...collateral Return.assets: ', collateralValue);
        //let collateralAmounts = convertMaestroUtxoAmount(collateralValue);
        let collateralAmounts = [];
        for (let keyIndex = 0; keyIndex < collateralValue.length; keyIndex++) {
          let asset = collateralValue[keyIndex];
          let am = {};
          if (asset.unit === "lovelace") {
            am.unit = "lovelace";
            am.quantity = asset.amount.toString();
            collateralAmounts.push(am);
            continue;
          }
          else {
            // to check output token policyId is related to check token
            let policyId = asset.unit.slice(0, 56)
            let asset_name = asset.unit.slice(56);
            am.unit = policyId + "." + asset_name;
            am.quantity = asset.amount.toString();
            collateralAmounts.push(am);

            if (this.treasuryUtxoMgr.checkTokenPolicyIds.includes(policyId)) {
              console.log('\n\n .........collateral checkTokenPolicyIds includes:  ', policyId);
              await this.treasuryUtxoMgr.addUtxo(tx.collateral_return.address, tx.id, formatedOutputs.length,
                blockInfo.height, blockInfo.slot);

            } else {
              let nftCheckTokenPolicyIds = await this.nftTreasuryUtxoMgr.getCheckTokenPolicyIds();
              if (nftCheckTokenPolicyIds.includes(policyId)) {
                console.log('\n\n .........collateral checkTokenPolicyIds includes:  ', policyId);
                await this.nftTreasuryUtxoMgr.addUtxo(tx.collateral_return.address, tx.id, formatedOutputs.length,
                  blockInfo.height, blockInfo.slot);
              }
            }
          }
        }

        let collateralOutput = {
          "address": tx.collateral_return.address,
          "amount": collateralAmounts,
          "datum": tx.collateral_return.datum,
          "datumHash": tx.collateral_return.datumHash
        }
        console.log("collateralOutput:", collateralOutput);
        console.log("formatedOutputs:", formatedOutputs);
        formatedOutputs.push(collateralOutput);
      }

      // test 
      let txScriptHash = tx.scriptIntegrityHash;
      console.log("...test...txScriptHash: ", txScriptHash);

      let bMintTask = false;
      let bMsgTask = false;
      let bMintedNFT = false;
      let mintInfoAry = new Array();
      if ((undefined !== tx.mint) && (tx.mint.length > 0)) {

        let nftPolicyIds = await this.getMintNFTPolicyId(mapDbNameInst);

        for (let idx_mint = 0; idx_mint < tx.mint.length; ++idx_mint) {
          let mint = tx.mint[idx_mint];
          console.log("idx_mint:", idx_mint, "mint:", mint);
          if (mint.unit === "lovalace") {
            continue;
          }

          let policyId = mint.unit.slice(0, 56);
          let name = mint.unit.slice(56);
          let mintItem = {
            "unit": policyId + "." + name,
            "amount": mint.amount
          };
          mintInfoAry.push(mintItem);
          console.log("mintItem:", mintItem);
          console.log("mintInfoAry:", mintInfoAry);

          // to parse if minted nft asset
          let policyIdIndex = nftPolicyIds.indexOf(policyId);
          if (-1 !== policyIdIndex) {
            bMintedNFT = true;
          } else if (-1 !== this.tokenPolicyIds.indexOf(policyId)) {
            bMintTask = true;
          } else if (-1 !== this.msgTokenPolicyIds.indexOf(policyId)) {
            bMsgTask = true;
          }

          console.log("bMsgTask:", bMsgTask);
          console.log("bMintedNFT:", bMintedNFT);

          // to record mint info in mintInfo db table	
          let mintInfo = {
            "tokenId": mintItem.unit,
            "txId": tx.id,
            "mintValue": parseInt(mint.amount),
            "blockHeight": blockInfo.height,
            "slot": blockInfo.slot,
            "security_Confirmed": this.bSecurityConfirmedByDefault, // need to security check by external resource 
            "bMintedNFT": bMintedNFT,
            "bMintTask": bMintTask,
            "bMsgTask": (0 < parseInt(mint.amount)) ? bMsgTask : false
          }
          console.log("mintInfo:", mintInfo);
          bMsgTask = mintInfo.bMsgTask;

          let filter = {
            "tokenId": mintItem.unit,
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

      console.log("\n...meta ...: ", tx.metadata);
      // to formate the tx meta data
      let bRelated = bMintTask || bMintedNFT || bMsgTask || bTreasuryRelateTx || bNftTreasuryRelateTx;
      if (bRelated) {
        let formatedMetaData = undefined;
        try {
          if (tx.metadata) {
            let metaLabelArray = new Array();
            let metaHash = tx.metadata.hash;

            if (2 === this.txMetaDataSource) {
              // to get tx metaData from blockForst
              let jsonMetaDataFromBlockForst = await this.blockFrostApi.txsMetadata(tx.id);
              for (let mdIndex = 0; mdIndex < jsonMetaDataFromBlockForst.length; mdIndex++) {
                let mdItem = jsonMetaDataFromBlockForst[mdIndex];
                mdItem.json_metadata.type = toSafeString(mdItem.json_metadata.type);
                mdItem.json_metadata.tokenPairID = toSafeString(mdItem.json_metadata.tokenPairID);
                console.log("\n\n\n\n====>...decoded jsonMetaDataFromBlockForst ...: ", mdItem);
              }

              metaLabelArray = jsonMetaDataFromBlockForst;
              console.log("\n\n\n\n====>...decoded jsonMetaDataFromBlockForst metaLabelArray...: ", metaLabelArray);

            } else {
              // to decode tx metaData from ogmios

              let prefix = "0x";
              for (let key in tx.metadata) {
                console.log("\n...meta item...: ", key, tx.metadata[key]);
                let jsonMetaData = undefined;
                let cborMetaData = undefined;

                let dataItem = tx.metadata[key];
                console.log("key:", key, "dataItem:", dataItem);
                if (undefined !== dataItem) {
                  jsonMetaData = dataItem;
                }
                console.log("\n...parseMetadata...jsonMetaData: ", jsonMetaData);
                if (jsonMetaData.smgID) {
                  if (-1 === jsonMetaData.smgID.indexOf("0x")) {
                    // console.log("\n...parseMetadata...toAccount: ", jsonMetaData.toAccount);
                    jsonMetaData.smgID = prefix + jsonMetaData.smgID;
                  }
                }
                if (jsonMetaData.toAccount) {
                  if (Array.isArray(jsonMetaData.toAccount)) {
                    //jsonMetaData.toAccount.join(""); // no need to handle midnight address
                  } else {
                    if (-1 === jsonMetaData.toAccount.indexOf("0x")) {
                      let tokenPairId = jsonMetaData.tokenPairID;
                      let addressPrex = await this.parseAddressPrefix(tokenPairId);
                      console.log("\n...parseMetadata...toAccount: ", jsonMetaData.toAccount);
                      jsonMetaData.toAccount = addressPrex + jsonMetaData.toAccount;
                    }
                  }
                }
                if (jsonMetaData.uniqueId) {
                  if (-1 === jsonMetaData.uniqueId.indexOf("0x")) {
                    // console.log("\n...parseMetadata...toAccount: ", jsonMetaData.toAccount);
                    jsonMetaData.uniqueId = prefix + jsonMetaData.uniqueId;
                  }
                }
                if (jsonMetaData.type) {
                  jsonMetaData.type = jsonMetaData.type.toString();
                }
                if (jsonMetaData.tokenPairID) {
                  jsonMetaData.tokenPairID = jsonMetaData.tokenPairID.toString();
                }

                let metaDataInfo = {
                  "label": key,
                  "json_metadata": jsonMetaData,
                  "cbor_metadata": cborMetaData
                }
                console.log('[txMetaData] add metaDataInfo: ', metaDataInfo);
                metaLabelArray.push(metaDataInfo);
              }

            }

            formatedMetaData = {
              "hash": metaHash,
              "metaData": metaLabelArray
            }
          }

        } catch (e) {
          console.log("\n...parse meta exception: ", e);
          continue;
        }
        console.log('[txMetaData]: ', formatedMetaData);

        // to get the validityInterval of tx
        let valInteral = tx.validityInterval;
        console.log('[validityInterval]: ', valInteral);
        let txTtl = {
          "invalidBefore": (undefined === valInteral) ? null : valInteral.invalidBefore,
          "invalidHereafter": (undefined === valInteral) ? null : valInteral.invalidAfter,
        };

        let strFee = tx.fee.toString();
        let txInfo = {
          "txId": tx.tx_hash,
          "blockHeight": blockInfo.height,
          "blockHash": blockInfo.id,
          "slot": blockInfo.slot,
          "txIndex": tx.block_tx_index,
          "time": curBlockTimeStamp,
          "metaData": formatedMetaData,
          "collaterals": collateralInputs,
          "inputs": formatedInputs,
          "outputs": formatedOutputs,
          "validityInterval": txTtl,
          "mint": mintInfoAry,
          "redeemers": txRedeemers,
          "datums": txDatums,
          "fee": strFee,
          "inputSource": tx.inputSource,
          "bMintTask": bMintTask,
          "treasury_related": bTreasuryRelateTx,
          "bMintedNFT": bMintedNFT,
          "nftTreasury_related": bNftTreasuryRelateTx,
          "bMsgTask": bMsgTask
        }
        console.log('txInfo:  ', txInfo);

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
          "tx_hash": tx.tx_hash,
          "tx_index": tx.block_tx_index,  // index in the block
          "treasury_related": bTreasuryRelateTx,
          "nftTreasury_related": bNftTreasuryRelateTx,
          "security_Confirmed": this.bSecurityConfirmedByDefault // need to security check by external resource
        }
        blockTxs.push(txObj);

      }

    }

    return blockTxs;
  }

  async updateBlockInfo(blockInfo, curBlockTimeStamp, blockTxs, mapDbNameInst) {
    let blockInfoDbObj = mapDbNameInst.get("blockInfo");

    let syncedBlockInfo = {
      "blockHeight": blockInfo.height,
      "blockHash": blockInfo.id,
      "slot": blockInfo.slot,
      "hash": blockInfo.id,
      "time": curBlockTimeStamp,
      "blockType": this.blockType,
      "blockEra": this.blockEra,
      "blockTxs": blockTxs
    }

    let filter = {
      "blockHeight": blockInfo.height
    }
    let ret = await blockInfoDbObj.findByOption(filter);
    if (ret.length > 0) {
      await blockInfoDbObj.deleteByOption(filter);
    }
    // console.log('babbage blockInfo:  ', syncedBlockInfo);
    await blockInfoDbObj.insert(syncedBlockInfo);
    //console.log('[sync new babbage block]', syncedBlockInfo);
  }

  async updateSyncedInfo(blockInfo, curBlockTimeStamp, mapDbNameInst) {

    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");

    let syncedData = {
      $set: {
        "blockHeight": blockInfo.height,
        "time": curBlockTimeStamp,
        "slot": blockInfo.slot,
        "hash": blockInfo.id
      }
    }

    let filter = {
      "chainType": this.chainType
    }

    await syncedInfoDbObj.updateByOption(filter, syncedData);
  }
}

module.exports = IndexApiBlockHandler;
