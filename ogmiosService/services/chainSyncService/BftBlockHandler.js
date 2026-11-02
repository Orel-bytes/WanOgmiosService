const { parseMetadata,
  convertMaestroUtxoAmount,
  convertMaestroRedeemers,
  decodeMaestroMetaData,
  decodeCborMetaData,
  toSafeString,
  convertBlockForstUtxoAmount } = require("../utilService/commonUtils");
const BlockFrostAPI = require('@blockfrost/blockfrost-js').BlockFrostAPI;

class BftBlockHandler {
  constructor(mapUtxoManager, bSecurityConfirmEnable, iWanService, mapServiceConfig, logUtil) {
    this.chainType = "ADA";
    this.blockType = "bft";

    this.logUtilSrv = logUtil;

    this.msgTokenPolicyIds = mapServiceConfig.get("msgTokenPolicyIdCfg");
    this.tokenPolicyIds = mapServiceConfig.get("tokenPolicyIdCfg");
    this.blockFrostCfg = mapServiceConfig.get("blockFrostConfig");
    this.txMetaDataSource = mapServiceConfig.get("txMetaDataSource");

    this.treasuryUtxoMgr = mapUtxoManager.get("NonNFT");
    this.nftTreasuryUtxoMgr = mapUtxoManager.get("NFT");

    this.iWanService = iWanService;
    this.cardanoChainId = iWanService.cardanoChainID;

    this.mapChainID2Info = new Map();

    this.memIWanRecord = new Map();
    this.tokenPairDataValidLatestTs = 600000; //10*60*1000
    this.chainInfoDataValidLatestTs = 3600000; //60*60*1000

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
    console.log("\n\n\n\nBftBlockHandler..mapDbNameInst: ", mapDbNameInst);
    let policyIdDbInst = mapDbNameInst.get("mappingTokenPolicyIdConfig");
    console.log("BftBlockHandler..policyIdDbInst: ", policyIdDbInst);
    if (undefined === policyIdDbInst) {
      return undefined;
    }

    let policyIdFilter = {
      "checkTokenType": 2 // 1: Non-NFT; 2: NFT
    };
    let ret = await policyIdDbInst.findByOption(policyIdFilter);
    if (undefined === ret) {
      console.log("BftBlockHandler...nft policyId is failed to get...");
      return undefined;
    }

    if ((undefined === ret[0]) || (0 === ret[0].policyIds.length)) {
      console.log("BftBlockHandler...nft policyIds is empty...");
      return [];
    }

    let nftPolicyIds = ret[0].policyIds;
    console.log("BftBlockHandler...nft policyIds is: ", nftPolicyIds);
    return nftPolicyIds;
  }

  getTokenPairInfoById(tokenPairId) {
    let tokenPairInfo = this.iWanService.getTokenPairById(tokenPairId);
    console.log("tokenPair Info: ", tokenPairInfo);

    return tokenPairInfo;
  }

  parseAddressPrefix(tokenPairId) {
    let tokenPairInfo = this.getTokenPairInfoById(tokenPairId);
    if (undefined === tokenPairInfo) {
      return undefined;
    }

    // let fromChainID = tokenPairInfo.fromChainID;
    let targetChainID = tokenPairInfo.toChainID;
    if (this.cardanoChainId === tokenPairInfo.toChainID) {
      // if to chain is cardano, then to check from chainID
      targetChainID = tokenPairInfo.fromChainID;
    }

    let chainInfo = this.mapChainID2Info.get(targetChainID);
    if (undefined === chainInfo) {
      return "";
    }

    let addressPrex = chainInfo.addressPrex;
    return addressPrex;
  }

  async getTxUtxosByBlockForst(txId) {
    try {

      let txUtxosRet = await this.blockFrostApi.txsUtxos(txId);
      this.logUtilSrv.logInfo("PraosBlockHandler", "...getTxUtxosByBlockForst...txUtxosRet...", JSON.stringify(txUtxosRet));

      return txUtxosRet;

    } catch (e) {
      console.log("\n\n\n...getTxUtxosByBlockForst...exception:", e);
      return undefined;
    }
  }

  //scan block backward nomally
  async processBlock(blockInfo, mapDbNameInst) {

    let blockInfoDbObj = mapDbNameInst.get("blockInfo");
    let syncedInfoDbObj = mapDbNameInst.get("chainSyncInfo");
    let txInfoDbObj = mapDbNameInst.get("txInfo");

    console.log("\n......rollForward praos block:", blockInfo);
    let chainFilter = {
      "chainType": this.chainType
    }
    let syncedBlocks = await syncedInfoDbObj.findByOption(chainFilter);
    let latestBlockTs = syncedBlocks[0].time;
    let latestBlockSlot = syncedBlocks[0].slot;

    this.blockEra = blockInfo.era;
    let deltaTime = blockInfo.slot - latestBlockSlot;
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
    for (let index = 0; index < blockInfo.transactions.length; index++) {
      let bTreasuryRelateTx = false;
      let bNftTreasuryRelateTx = false;

      const tx = blockInfo.transactions[index];
      console.log('\n\n .........[tx]:  ', tx);
      const txRedeemers = convertMaestroRedeemers(tx.redeemers);
      console.log('\n\n .........tx redeemers:  ', txRedeemers);
      const txDatums = tx.datums;
      console.log('\n\n .........tx datums:  ', txDatums);

      // to formate the input objects
      let formatedInputs = new Array();
      const txInputs = tx.inputs;
      console.log('\n\n .........[txInputs]:  ', txInputs);
      for (let j = 0; j < txInputs.length; j++) {
        let txHash = txInputs[j].transaction.id;
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

        if (("" !== owner) && ("inputs" === tx.spends)) {
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
      const collaterals = tx.collaterals;
      console.log('\n\n .........[collaterals]:  ', collaterals);
      if (collaterals) {
        for (let j = 0; j < collaterals.length; j++) {
          let txHash = collaterals[j].transaction.id;
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

          if (("" !== owner) && ("collaterals" === tx.spends)) {
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
      const txOutputs = tx.outputs;
      console.log('\n\n .........[txOutputs]:  ', txOutputs);
      for (let i = 0; i < txOutputs.length; i++) {
        // step 1: to parse the value
        let utxoValue = txOutputs[i].value;

        if (this.treasuryUtxoMgr.treasuryScAddress === txOutputs[i].address) {
          bTreasuryRelateTx = true;
          await this.treasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }
        if (this.nftTreasuryUtxoMgr.treasuryScAddress === txOutputs[i].address) {
          bNftTreasuryRelateTx = true;
          await this.nftTreasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }

        let amounts = convertMaestroUtxoAmount(utxoValue);
        for (let index = 0; index < amounts.length; index++) {
          let key = amounts[index].unit;
          if ("lovelace" === key) {
            continue;
          }

          // TODO: to parse output utxo's value if related to check token policyId
          let policyId_name = key.split(".");
          // to check output is treasury related
          if (this.treasuryUtxoMgr.checkTokenPolicyIds.includes(policyId_name[0])) {
            console.log('\n\n .........checkTokenPolicyIds includes:  ', policyId_name[0]);
            await this.treasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
              blockInfo.height, blockInfo.slot);
          } else {
            let nftCheckTokenPolicyIds = await this.nftTreasuryUtxoMgr.getCheckTokenPolicyIds();
            if (nftCheckTokenPolicyIds.includes(policyId_name[0])) {
              console.log('\n\n .........nft checkTokenPolicyIds includes:  ', policyId_name[0]);
              await this.nftTreasuryUtxoMgr.addUtxo(txOutputs[i].address, tx.id, formatedOutputs.length,
                blockInfo.height, blockInfo.slot);
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

      if (tx.collateralReturn) {
        console.log('\n\n ...tx...collateral Return: ', tx.collateralReturn);
        let collateralValue = tx.collateralReturn.value;
        let collateralAmounts = convertMaestroUtxoAmount(collateralValue);

        if (this.treasuryUtxoMgr.treasuryScAddress === tx.collateralReturn.address) {
          bTreasuryRelateTx = true;
          await this.treasuryUtxoMgr.addUtxo(tx.collateralReturn.address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        } else if (this.nftTreasuryUtxoMgr.treasuryScAddress === tx.collateralReturn.address) {
          bNftTreasuryRelateTx = true;
          await this.nftTreasuryUtxoMgr.addUtxo(tx.collateralReturn.address, tx.id, formatedOutputs.length,
            blockInfo.height, blockInfo.slot);
        }

        for (let keyIndex = 0; keyIndex < collateralAmounts.length; keyIndex++) {
          let key = collateralAmounts[keyIndex].unit;
          if ("lovelace" === key) {
            continue;
          }

          // to check output token policyId is related to check token
          let policyId_name = key.split(".");
          if (this.treasuryUtxoMgr.checkTokenPolicyIds.includes(policyId_name[0])) {
            console.log('\n\n .........collateral checkTokenPolicyIds includes:  ', policyId_name[0]);
            await this.treasuryUtxoMgr.addUtxo(tx.collateralReturn.address, tx.id, formatedOutputs.length,
              blockInfo.height, blockInfo.slot);

          } else {
            let nftCheckTokenPolicyIds = await this.nftTreasuryUtxoMgr.getCheckTokenPolicyIds();
            if (nftCheckTokenPolicyIds.includes(policyId_name[0])) {
              console.log('\n\n .........collateral checkTokenPolicyIds includes:  ', policyId_name[0]);
              await this.nftTreasuryUtxoMgr.addUtxo(tx.collateralReturn.address, tx.id, formatedOutputs.length,
                blockInfo.height, blockInfo.slot);
            }
          }
        }


        let collateralOutput = {
          "address": tx.collateralReturn.address,
          "amount": collateralAmounts,
          "datum": tx.collateralReturn.datum,
          "datumHash": tx.collateralReturn.datumHash
        }
        formatedOutputs.push(collateralOutput);
      }

      // test 
      let txScriptHash = tx.scriptIntegrityHash;
      console.log("...test...txScriptHash: ", txScriptHash);

      let bMintTask = false;
      let bMsgTask = false;
      let bMintedNFT = false;
      let mintInfoAry = new Array();
      let txMint = tx.mint;
      if (undefined !== txMint) {
        let nftPolicyIds = await this.getMintNFTPolicyId(mapDbNameInst);

        let mintUtxosAry = convertMaestroUtxoAmount(txMint);
        for (let index = 0; index < mintUtxosAry.length; index++) {
          //let policyId = unit.slice(0, 56);
          //let name = unit.slice(57);
          let unit = mintUtxosAry[index].unit;
          let amount = mintUtxosAry[index].quantity;
          let mintItem = {
            "unit": unit,
            "amount": parseInt(amount)
          }
          mintInfoAry.push(mintItem);

          if ("lovelace" === unit) {
            continue;
          }

          // to parse if minted nft asset
          let policyId = unit.slice(0, 56);
          //let name = unit.slice(57);
          let policyIdIndex = nftPolicyIds.indexOf(policyId);
          if (-1 !== policyIdIndex) {
            bMintedNFT = true;
          } else if (-1 !== this.tokenPolicyIds.indexOf(policyId)) {
            bMintTask = true;
          } else if (-1 !== this.msgTokenPolicyIds.indexOf(policyId)) {
            bMsgTask = true;
          }

          if (bMintedNFT || bMintTask || bMsgTask) {
            // to record mint info in mintInfo db table	
            let mintInfo = {
              "tokenId": unit,
              "txId": tx.id,
              "mintValue": parseInt(amount),
              "blockHeight": blockInfo.height,
              "slot": blockInfo.slot,
              "security_Confirmed": this.bSecurityConfirmedByDefault, // need to security check by external resource 
              "bMintedNFT": bMintedNFT,
              "bMintTask": bMintTask,
              "bMsgTask": (0 < parseInt(amount)) ? bMsgTask : false
            }

            bMsgTask = mintInfo.bMsgTask;

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
                console.log("\n\n\n\n====>...decoded jsonMetaDataFromBlockForst ...: ", mdItem);
              }

              metaLabelArray = jsonMetaDataFromBlockForst;
              console.log("\n\n\n\n====>...decoded jsonMetaDataFromBlockForst metaLabelArray...: ", metaLabelArray);

            } else {
              // to decode tx metaData from ogmios
              let metaLabels = tx.metadata.labels;
              for (let key in metaLabels) {
                console.log("\n...meta item...: ", key, metaLabels[key]);
                let jsonMetaData = undefined;
                let cborMetaData = undefined;

                if (undefined !== metaLabels[key].cbor) {
                  let preString = "5839";
                  if (-1 !== metaLabels[key].cbor.indexOf(preString)) {
                    cborMetaData = metaLabels[key].cbor.replace(preString, "0x");
                  } else {
                    cborMetaData = metaLabels[key].cbor;
                  }
                  console.log("\n...parseMetadata...cborMetaData: ", cborMetaData);
                  jsonMetaData = decodeCborMetaData(cborMetaData);

                } else if (undefined !== metaLabels[key].json) {
                  let dataItem = metaLabels[key].json;
                  console.log("\n...parseMetadata...jsonMetaData: ", dataItem);
                  jsonMetaData = parseMetadata(dataItem);
                }

                jsonMetaData.tokenPairID = toSafeString(jsonMetaData.tokenPairID);
                jsonMetaData.type = toSafeString(jsonMetaData.type);
                console.log("\n...parseMetadata...jsonMetaData: ", jsonMetaData);

                let prefix = "0x";
                if ((undefined !== jsonMetaData) && (undefined !== jsonMetaData.smgID)) {
                  console.log("\n...parseMetadata...smgID: ", jsonMetaData.smgID);

                  if (-1 === jsonMetaData.smgID.indexOf("0x")) {
                    jsonMetaData.smgID = prefix + jsonMetaData.smgID;
                  }
                }
                if ((undefined !== jsonMetaData) && (undefined !== jsonMetaData.toAccount)
                  && ("string" === typeof (jsonMetaData.toAccount))) {

                  if (-1 === jsonMetaData.toAccount.indexOf("0x")) {
                    let tokenPairId = jsonMetaData.tokenPairID;
                    let addressPrex = await this.parseAddressPrefix(tokenPairId);

                    console.log("\n...parseMetadata...toAccount: ", jsonMetaData.toAccount);
                    jsonMetaData.toAccount = addressPrex + jsonMetaData.toAccount;
                  }
                }
                if ((undefined !== jsonMetaData) && (undefined !== jsonMetaData.uniqueId)
                  && ("string" === typeof (jsonMetaData.uniqueId))) {

                  if (-1 === jsonMetaData.uniqueId.indexOf("0x")) {
                    jsonMetaData.uniqueId = prefix + jsonMetaData.uniqueId;
                  }
                }
                // if((undefined !== jsonMetaData.fromAccount)
                //   && ("string" === typeof (jsonMetaData.fromAccount))){
                //     console.log("\n...parseMetadata...fromAccount: ", jsonMetaData.fromAccount);
                //     jsonMetaData.fromAccount = prefix + jsonMetaData.fromAccount;
                // }

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

        let txUtxosRet = await this.getTxUtxosByBlockForst(tx.id);
        this.logUtilSrv.logInfo("PraosBlockHandler", "...updateTxsInfo...getTxUtxosByBlockForst...", txUtxosRet);
        if (undefined !== txUtxosRet) {

          for (let i = 0; i < txUtxosRet.inputs.length; i++) {
            let utxoItem = txUtxosRet.inputs[i];
            let bCollateral = utxoItem.collateral;

            if (bCollateral) {
              for (let j = 0; j < collateralInputs.length; j++) {
                if ((collateralInputs[j].tx_hash === utxoItem.tx_hash)
                  && (collateralInputs[j].tx_index === utxoItem.output_index)) {

                  collateralInputs[j].utxo_owner = utxoItem.address;
                  collateralInputs[j].utxo_amount = convertBlockForstUtxoAmount(utxoItem.amount);
                  break;
                }
              }
            } else {
              for (let j = 0; j < formatedInputs.length; j++) {
                if ((formatedInputs[j].tx_hash === utxoItem.tx_hash)
                  && (formatedInputs[j].tx_index === utxoItem.output_index)) {

                  formatedInputs[j].utxo_owner = utxoItem.address;
                  formatedInputs[j].utxo_amount = convertBlockForstUtxoAmount(utxoItem.amount);
                  break;
                }
              }
            }

          }
        }
        this.logUtilSrv.logInfo("PraosBlockHandler", "...updateTxsInfo...formatedInputs", JSON.stringify(formatedInputs));
        this.logUtilSrv.logInfo("PraosBlockHandler", "...updateTxsInfo...collateralInputs", JSON.stringify(collateralInputs));

        let strFee = tx.fee.ada.lovelace.toString();
        let txInfo = {
          "txId": tx.id,
          "blockHeight": blockInfo.height,
          "blockHash": blockInfo.id,
          "slot": blockInfo.slot,
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
          "fee": strFee,
          "inputSource": tx.spends,
          "bMintTask": bMintTask,
          "treasury_related": bTreasuryRelateTx,
          "bMintedNFT": bMintedNFT,
          "nftTreasury_related": bNftTreasuryRelateTx,
          "bMsgTask": bMsgTask
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
    console.log('[sync new babbage block]', syncedBlockInfo);
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

    console.log('[sync new babbage block]', syncedData);
  }
}

module.exports = BftBlockHandler;
