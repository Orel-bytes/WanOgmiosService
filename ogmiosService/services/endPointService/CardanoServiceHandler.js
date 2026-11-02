const ServiceFramework = require("../../framework/ServiceFramework");
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const BigNumber = require('bignumber.js');
const { sleep } = require("../utilService/commonUtils");
const {
    createInteractionContext,
    createStateQueryClient,
    createTxSubmissionClient,
    TxSubmission
} = require('@cardano-ogmios/client');

const UtxoStatus_SecurityConfirmFailed = -2;
const UtxoStatus_Consumed = -1;
const UtxoStatus_PendingAvailable = 0;
const UtxoStatus_Available = 1;

class CardanoServiceHandler {
    constructor() {

        console.log("\n\n\n... instance CardanoServiceHandler...");
    }

    async init() {
        // to scan rp db records and to get the timeout rp
        this.storageSrvIns = ServiceFramework.getService("StorageServiceInterface", "StorageService");
        this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
        this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
        this.securityConfirmSrv = ServiceFramework.getService("AgentServiceInterface", "SecurityConfirmService");

        let blockInfoSchema = await this.configService.getGlobalConfig("blockInfoSchema");
        this.blockInfoDbInst = await this.storageSrvIns.getDBIns(blockInfoSchema.name);

        let syncedDataSchema = await this.configService.getGlobalConfig("chainSyncSchema");
        this.blockHeightDbInst = await this.storageSrvIns.getDBIns(syncedDataSchema.name);

        let txInfoSchema = await this.configService.getGlobalConfig("txInfoSchema");
        this.txInfoDbInst = await this.storageSrvIns.getDBIns(txInfoSchema.name);

        let mintInfoSchema = await this.configService.getGlobalConfig("mintInfoSchema");
        this.mintInfoDbInst = await this.storageSrvIns.getDBIns(mintInfoSchema.name);

        let balancedCfgInfoSchema = await this.configService.getGlobalConfig("balancedCfgInfoSchema");
        this.balancedCfgInfoDbInst = await this.storageSrvIns.getDBIns(balancedCfgInfoSchema.name);

        let mappingTokenPolicyIdSchema = await this.configService.getGlobalConfig("mappingTokenPolicyIdSchema");
        this.policyIdDbInst = await this.storageSrvIns.getDBIns(mappingTokenPolicyIdSchema.name);


        this.treasuryScCfg = await this.configService.getGlobalConfig("treasuryScCfg");

        this.ogmiosServerConfig = await this.configService.getGlobalConfig("ogmiosServerCfg");
        await this.connectOgmiosNode();
        await sleep(5*1000);

        this.extraDelayBlockNum = 30;
    }

    byteArray2Hexstring(byteArray) {
        return Array.from(byteArray, function (byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('')
    }

    async reconnectOgmiosNode() {
        setTimeout(async () => {
            try {
                await this.connectOgmiosNode();
            } catch (error) {
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...reconnectOgmiosNode...error...", error);
                this.reconnectOgmiosNode();
            }
        }, 10000);
    }

    async connectOgmiosNode() {

        // ogmiosServerCfg:{
        //     host: "ogmios.wanchain.gomaestro-api.org",
        //     port: '',
        //     apiKey: "v0LXAjiRQAm3PNjlFSlqB8rfgUp7OExE"
        // }
        let connectionOption = (undefined === this.ogmiosServerConfig.apiKey) ? {
            host: this.ogmiosServerConfig.host,
            port: this.ogmiosServerConfig.port,
            // tls: true
        } : {
            host: this.ogmiosServerConfig.host,
            port: this.ogmiosServerConfig.port,
            tls: true,
            apiKey: this.ogmiosServerConfig.apiKey
        }

        this.context = await createInteractionContext(this.errorHandler.bind(this),
            this.closeHandler.bind(this),
            {
                connection: connectionOption,
                interactionType: 'LongRunning'
            });


        this.queryClient = await createStateQueryClient(this.context);
        (await this.queryClient.chainTip()).slot;

        // tx submit client
        this.txSubmitClient = await createTxSubmissionClient(this.context);
    }


    async errorHandler(error) {
        console.error(error);
        // await client.shutdown();
    }

    async closeHandler(code, reason) {
        // console.log('WS close: code =', code, 'reason =', reason);
        // await client.shutdown();
        await this.reconnectOgmiosNode();
    }

    async handleGetUtxos(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetUtxos...request:", reqOptions);
        //      let qryParams = reqOptions.qryParams;
        try {
            let utxoObjs = await this.queryClient.utxo(reqOptions);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetUtxos...length:", utxoObjs.length);

            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                let txIn = utxoItem[0];
                let txOut = utxoItem[1];

                let utxoValue = txOut.value;

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
                        console.log("formate asset amount: ", assetAmountObj);
                        amounts.push(assetAmountObj);
                    }
                }

                let formatedUtxo = {
                    "tx_hash": txIn.txId,
                    "tx_index": txIn.index,
                    "address": txOut.address,
                    "amount": amounts,
                    "data_hash": txOut.datum,
                    "datumHash": txOut.datumHash,
                    "script": txOut.script
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetUtxos...error: ", e);
            return undefined;
        }
    }

    async handleGetBalancedConfig(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetBalancedConfig...", reqOptions);

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };
            let balancedCfgInfo = await this.balancedCfgInfoDbInst.findByOption(filter);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetBalancedConfig...", balancedCfgInfo);

            if (balancedCfgInfo.length > 0) {
                return balancedCfgInfo[0];
            }
            return undefined;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetBalancedConfig error...", e);
            return undefined;
        }
    }

    async getMintInfoByPolicyId(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getMintInfoByPolicyId...", reqOptions);
        let safeBlockNum = (undefined === reqOptions.safeBlockNum) ? this.extraDelayBlockNum : reqOptions.safeBlockNum;

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };

            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            let latestSafeBlockNo = latestBlockPoint[0].blockHeight - safeBlockNum;
            if (latestSafeBlockNo < reqOptions.endBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...to block is greater than latest block...", latestSafeBlockNo);
                return undefined;
            }

            filter = {
                "tokenId": {
                    "$regex": reqOptions.policyId
                },
                "blockHeight": {
                    "$gte": reqOptions.beginBlockNo,
                    "$lte": reqOptions.endBlockNo
                }
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getMintInfoByPolicyId...", reqOptions.tokenId, assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getMintInfoByPolicyId error...", e);
            return undefined;
        }

    }
   
    async getMsgTaskInfo(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getMsgTaskInfo...", reqOptions);
        let safeBlockNum = (undefined === reqOptions.safeBlockNum) ? this.extraDelayBlockNum : reqOptions.safeBlockNum;

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };

            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            let latestSafeBlockNo = latestBlockPoint[0].blockHeight - safeBlockNum;
            if (latestSafeBlockNo < reqOptions.endBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestSafeBlockNo);
                return undefined;
            }

            filter = {
                // $or: checkTokenRegexOption,
                "blockHeight": {
                    "$gte": reqOptions.beginBlockNo,
                    "$lte": reqOptions.endBlockNo
                },
                "bMsgTask": true
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getMsgTaskInfo...", assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getMsgTaskInfo error...", e);
            return undefined;
        }

    }

    async getNftMintInfo(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNftMintInfo...", reqOptions);
        let safeBlockNum = (undefined === reqOptions.safeBlockNum) ? this.extraDelayBlockNum : reqOptions.safeBlockNum;

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };

            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            let latestSafeBlockNo = latestBlockPoint[0].blockHeight - safeBlockNum;
            if (latestSafeBlockNo < reqOptions.endBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...to block is greater than latest block...", latestSafeBlockNo);
                return undefined;
            }

            filter = {
                // $or: checkTokenRegexOption,
                "blockHeight": {
                    "$gte": reqOptions.beginBlockNo,
                    "$lte": reqOptions.endBlockNo
                },
                "bMintedNFT": true
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNftMintInfo...", reqOptions.tokenId, assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNftMintInfo error...", e);
            return undefined;
        }

    }

    async getAssetMintInfo(reqOptions) {

        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getAssetMintInfo...", reqOptions);

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < reqOptions.endBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, reqOptions.endBlockNo);
                return undefined;
            }

            filter = {
                "tokenId": reqOptions.tokenId,
                "blockHeight": {
                    "$gte": reqOptions.beginBlockNo,
                    "$lte": reqOptions.endBlockNo
                }
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getAssetMintInfo...", reqOptions.tokenId, assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getAssetMintInfo error...", e);
            return undefined;
        }
    }

    async getAssetMintage(reqOptions) {

        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getAssetMintage...", reqOptions);

        const maxDelayBlockNum = 10;
        let subFilter = {
            "tokenId": reqOptions.tokenId
        };
        let latestBlockPoint = await this.blockHeightDbInst.findByOption(subFilter);
        let maxRecordBlockId = latestBlockPoint[0].blockHeight - maxDelayBlockNum;
        if (0 >= maxRecordBlockId) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getAssetMintage...the latest block is less than 10: ", latestBlockPoint[0].blockHeight);
            return "0";
        }

        // get latest block height 
        try {
            let totalMintage = new BigNumber(0);
            let filter = {
                "tokenId": reqOptions.tokenId
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            for (let i = 0; i < assetMintRecords.length; i++) {
                let tmpRecord = assetMintRecords[i];
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...get asset mint record...", tmpRecord);
                if (tmpRecord.blockHeight > maxRecordBlockId) {
                    break;
                }

                let mintValue = new BigNumber(tmpRecord.mintValue);
                totalMintage = totalMintage.plus(mintValue);
            }

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getAssetMintage...", reqOptions.tokenId, totalMintage.toString());
            return totalMintage.toString();

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getAssetMintage error...", e);
            return undefined;
        }

    }

    async getLatestBlock(reqOptions) {
        console.log("\n\n .....getLatestBlock reqOptions: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getLatestBlock...", reqOptions);

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);

            let blockFilter = {
                "blockHeight": latestBlockPoint[0].blockHeight
            };
            let blockInfo = await this.blockInfoDbInst.findByOption(blockFilter);

            let blockObj = {
                "height": blockInfo[0].blockHeight,
                "hash": blockInfo[0].hash,
                "slot": blockInfo[0].slot,
                "time": blockInfo[0].time,
                "blockTxs": blockInfo[0].blockTxs
            }
            console.log("\n\n .....getLatestBlock : ", blockObj);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...queryRslt...", blockObj);
            return blockObj;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getLatestBlock error...", e);
            return undefined;
        }
    }

    async getBlockByNo(reqOptions) {
        // console.log("\n\n .....getBlockByNo: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getBlockByNo...", reqOptions);
        let blockNo = reqOptions.blockNo;

        try {
            // get block by height 
            let blockFilter = {
                "blockHeight": blockNo
            };
            let blockInfo = await this.blockInfoDbInst.findByOption(blockFilter);

            let blockObj = {
                "height": blockInfo[0].blockHeight,
                "hash": blockInfo[0].hash,
                "slot": blockInfo[0].slot,
                "time": blockInfo[0].time,
                "blockTxs": blockInfo[0].blockTxs
            }
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...queryRslt...", blockObj);
            return blockObj;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getBlockByNo error...", e);
            return undefined;
        }
    }

    async checkUtxoAvailable(reqOptions) {
        console.log("\n\n .....checkUtxoAvailable: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...checkUtxoAvailable...", reqOptions);
        const txId = reqOptions.txId;
        const txIndex = reqOptions.index;
        const validSlot = reqOptions.slot;

        try {
            // step 1: to check block if in safe scope
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            let latestSafeBlockNo = latestBlockPoint[0].blockHeight - this.extraDelayBlockNum;

            let blockFilter = {
                "blockHeight": latestSafeBlockNo
            };
            let blockInfo = await this.blockInfoDbInst.findByOption(blockFilter);
            if (blockInfo[0].slot < validSlot) {
                return UtxoStatus_PendingAvailable;
            }

            // step 2: to check utxo if has been used
            let txInAry = new Array();
            let txInItem = {
                "txId": txId,
                "index": txIndex
            };
            txInAry.push(txInItem);
            console.log("\n\n .....queryClient txInAry: ", txInAry);

            // TODO: to check get utxo by txId 
            // to query utxo on-chain 
            let rets = await this.queryClient.utxo(txInAry);
            console.log("\n\n .....queryClient rets: ", rets);
            for (let ipId = 0; ipId < rets.length; i++) {
                let utxoInputObj = rets[ipId][0];
                let utxoOutputObj = rets[ipId][1];

                let filter = new Array();
                filter.push(utxoOutputObj.address);
                let utxoObjs = await this.queryClient.utxo(filter);
                console.log("\n\n .....utxoObjs wanogmios: ", utxoObjs);
                for (let i = 0; i < utxoObjs.length; i++) {
                    let utxoItem = utxoObjs[i];
                    let txIn = utxoItem[0];
                    // let txOut = utxoItem[1];
                    if ((txId === txIn.txId) && (txIndex === txIn.index)) {

                        let secCheckRet = await this.securityConfirmSrv.confirmUtxoSecurity(utxoOutputObj.address, txId, txIndex);
                        if (false === secCheckRet) {
                            return undefined;
                        }
                        return UtxoStatus_Available;
                    }
                }
            }

            // this.logUtilSrv.logInfo("CardanoServiceHandler", "...checkUtxoAvailable...", consumedTxs);
            return UtxoStatus_Consumed;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...checkUtxoAvailable error...", e);
            return undefined;
        }
    }

    async getUtxoConsumedTx(reqOptions) {
        console.log("\n\n .....getUtxoConsumedTx: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getUtxoConsumedTx...", reqOptions);
        let txId = reqOptions.txId;
        let txIndex = reqOptions.index;
        // ({"inputs":{$in:[{"tx_hash" : "7357dfa9e9460afa3c3eefceb7e8a180debed771887132de8b2e553389cae100", "tx_index" : 1 }]}})

        try {
            let utxosAry = new Array();
            utxosAry.push({
                "tx_hash": txId,
                "tx_index": txIndex
            });
            let filter = {
                "inputs": { $in: utxosAry }
            }
            let consumedTxs = await this.txInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getUtxoConsumedTx...", consumedTxs);
            return consumedTxs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getUtxoConsumedTx error...", e);
            return undefined;
        }
    }

    async getNFTTreasuryTxsByBlockNo(reqOptions) {
        console.log("\n\n .....getNFTTreasuryTxsByBlockNo: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNFTTreasuryTxsByBlockNo...", reqOptions);
        let fromBlockNo = reqOptions.fromBlock;
        let toBlockNo = reqOptions.toBlock;
        let maxPageTxNum = 100;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < toBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, toBlockNo);
                return undefined;
            }

            let txs = new Array();
            let bContinue = true;
            let loopBeginBlockNo = fromBlockNo;
            let loopEndBlockNo = fromBlockNo + maxPageTxNum;
            do {
                if (loopEndBlockNo >= toBlockNo) {
                    loopEndBlockNo = toBlockNo;
                }

                // get block by height 
                let bFilter = {
                    "blockHeight": {
                        "$gte": loopBeginBlockNo,
                        "$lte": loopEndBlockNo
                    }
                }
                let blockObjs = await this.blockInfoDbInst.findAllByOption(bFilter);
                console.log("\n\n .....getNFTTreasuryTxsByBlockNo blockObjs: ", blockObjs.length);

                for (let i = 0; i < blockObjs.length; i++) {

                    let subTxs = blockObjs[i].blockTxs;
                    for (let j = 0; j < subTxs.length; j++) {

                        let bNftTreasuryRelateTx = subTxs[j].nftTreasury_related;
                        let bSecurityConfirmed = subTxs[j].security_Confirmed;
                        console.log("\n\n .....getNFTTreasuryTxsByBlockNo tx: ", blockObjs[i].blockHeight, j, subTxs[j]);
                        if (bNftTreasuryRelateTx) {
                            if (!bSecurityConfirmed) {
                                this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNFTTreasuryTxsByBlockNo with unconfirmed treasury tx: ", blockObjs[i].blockHeight);
                                return undefined;
                            }

                            let txObj = {
                                "tx_hash": subTxs[j].tx_hash,
                                "tx_index": subTxs[j].tx_index,
                                "block_height": blockObjs[i].blockHeight,
                                "block_time": blockObjs[i].time
                            }
                            txs.push(txObj);
                        }
                    }
                }

                loopBeginBlockNo = loopEndBlockNo + 1;
                if (loopBeginBlockNo > toBlockNo) {
                    bContinue = false;
                } else {
                    loopEndBlockNo = loopBeginBlockNo + maxPageTxNum;
                }

            } while (bContinue);


            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNFTTreasuryTxsByBlockNo...", txs);
            return txs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNFTTreasuryTxsByBlockNo error...", e);
            return undefined;
        }
    }

    async getTreasuryTxsByBlockNo(reqOptions) {
        console.log("\n\n .....getTxsByBlockHeight: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsByBlockHeight...", reqOptions);
        let fromBlockNo = reqOptions.fromBlock;
        let toBlockNo = reqOptions.toBlock;
        let maxPageTxNum = 100;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < toBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, toBlockNo);
                return undefined;
            }

            let txs = new Array();
            let bContinue = true;
            let loopBeginBlockNo = fromBlockNo;
            let loopEndBlockNo = fromBlockNo + maxPageTxNum;
            do {
                if (loopEndBlockNo >= toBlockNo) {
                    loopEndBlockNo = toBlockNo;
                }

                // get block by height 
                let bFilter = {
                    "blockHeight": {
                        "$gte": loopBeginBlockNo,
                        "$lte": loopEndBlockNo
                    }
                }
                let blockObjs = await this.blockInfoDbInst.findAllByOption(bFilter);
                console.log("\n\n .....getTxsByBlockHeight blockObjs: ", blockObjs.length);

                for (let i = 0; i < blockObjs.length; i++) {

                    let subTxs = blockObjs[i].blockTxs;
                    for (let j = 0; j < subTxs.length; j++) {

                        let bTreasuryRelateTx = subTxs[j].treasury_related;
                        let bSecurityConfirmed = subTxs[j].security_Confirmed;
                        console.log("\n\n .....getTxsByBlockHeight tx: ", blockObjs[i].blockHeight, j, subTxs[j]);
                        if (bTreasuryRelateTx) {
                            if (!bSecurityConfirmed) {
                                this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsByBlockHeight with unconfirmed treasury tx: ", blockObjs[i].blockHeight);
                                return undefined;
                            }

                            let txObj = {
                                "tx_hash": subTxs[j].tx_hash,
                                "tx_index": subTxs[j].tx_index,
                                "block_height": blockObjs[i].blockHeight,
                                "block_time": blockObjs[i].time
                            }
                            txs.push(txObj);
                        }
                    }
                }

                loopBeginBlockNo = loopEndBlockNo + 1;
                if (loopBeginBlockNo > toBlockNo) {
                    bContinue = false;
                } else {
                    loopEndBlockNo = loopBeginBlockNo + maxPageTxNum;
                }

            } while (bContinue);


            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsByBlockHeight...", txs);
            return txs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsByBlockHeight error...", e);
            return undefined;
        }
    }

    async getTxsByBlockHeight(reqOptions) {
        console.log("\n\n .....getTxsByBlockHeight: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsByBlockHeight...", reqOptions);
        let fromBlockNo = reqOptions.fromBlock;
        let toBlockNo = reqOptions.toBlock;
        let targetAddress = reqOptions.address;
        let maxPageTxNum = 50;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < toBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, toBlockNo);
                return undefined;
            }

            let txs = new Array();
            let bContinue = true;
            let loopBeginBlockNo = fromBlockNo;
            let loopEndBlockNo = fromBlockNo + maxPageTxNum;

            do {
                if (loopEndBlockNo >= toBlockNo) {
                    loopEndBlockNo = toBlockNo;
                }
                console.log("\n\n from block: ", loopBeginBlockNo, "...to: ", loopEndBlockNo);

                // to get the tx of this block 
                let txFilter = {
                    "blockHeight": {
                        "$gte": loopBeginBlockNo,
                        "$lte": loopEndBlockNo
                    }
                }
                let txObjs = await this.txInfoDbInst.findAllByOption(txFilter);
                if (0 === txObjs.length) {
                    loopBeginBlockNo = loopEndBlockNo + 1;
                    if (loopBeginBlockNo > toBlockNo) {
                        bContinue = false;
                    } else {
                        loopEndBlockNo = loopBeginBlockNo + maxPageTxNum;
                    }
                    continue;
                }
                console.log("txObjs: ", txObjs.length);

                for (let id = 0; id < txObjs.length; id++) {
                    console.log("\n txObjs: ", txObjs[id].txId, txObjs[id].blockHeight);
                    let bMatched = false;

                    // to check if filter by array attribution
                    for (let op = 0; op < txObjs[id].outputs.length; op++) {
                        let outputObj = txObjs[id].outputs[op];
                        console.log("targetAddress: ", targetAddress, "...outputObj.address:", outputObj.address);
                        if (outputObj.address === targetAddress) {

                            console.log("matched retlated tx: ", txObjs[id]);
                            let txObj = {
                                "tx_hash": txObjs[id].txId,
                                "tx_index": txObjs[id].txIndex,
                                "block_height": txObjs[id].blockHeight,
                                "block_time": txObjs[id].time
                            }
                            txs.push(txObj);
                            console.log("retlated tx: ", op, txs);

                            bMatched = true;
                            break;
                        }
                    }

                    if (!bMatched) {

                        let txInputs = ("inputs" === txObjs[id].inputSource ? txObjs[id].inputs : txObjs[id].collaterals);
                        for (let ip = 0; ip < txInputs.length; ip++) {
                            // to check the sender of this tx
                            let inputTxId = txInputs[ip].tx_hash;
                            let inputTxIndex = txInputs[ip].tx_index;
                            let inputTxFilter = {
                                "txId": inputTxId
                            }
                            let inputTxObjs = await this.txInfoDbInst.findByOption(inputTxFilter);
                            if (undefined === inputTxObjs[0]) {
                                continue;
                            }

                            // console.log("inputTxObjs: ", ip, inputTxId, inputTxIndex, inputTxObjs);
                            let utxoObj = inputTxObjs[0].outputs[inputTxIndex];
                            console.log("inputTxObjs utxoObj.address: ", utxoObj.address);
                            if (utxoObj.address === targetAddress) {
                                let txObj = {
                                    "tx_hash": txObjs[id].txId,
                                    "tx_index": txObjs[id].txIndex,
                                    "block_height": txObjs[id].blockHeight,
                                    "block_time": txObjs[id].time
                                }
                                txs.push(txObj);
                                console.log("retlated tx: ", ip, txs);
                                break;
                            }
                        }
                    }
                }

                loopBeginBlockNo = loopEndBlockNo + 1;
                if (loopBeginBlockNo > toBlockNo) {
                    bContinue = false;
                } else {
                    loopEndBlockNo = loopBeginBlockNo + maxPageTxNum;
                }
                console.log("next phase: ", loopBeginBlockNo, txs.length);

            } while (bContinue);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsByBlockHeight...", txs);
            console.log("\n\n total retlated tx: ", txs.length);
            return txs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsByBlockHeight error...", e);
            return undefined;
        }
    }

    async getAddressUtxosWithBlockHeight(reqOptions) {
        // console.log("\n\n .....getBlockByNo: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getAddressUtxosWithBlockHeight...", reqOptions);
        let address = reqOptions.address;
        let bCheckDatum = (address === this.treasuryScCfg) ? true : false;

        try {

            let filter = new Array();
            filter.push(address);
            let utxoObjs = await this.queryClient.utxo(filter);
            // console.log("\n\n .....utxoObjs: ", utxoObjs);

            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                let txIn = utxoItem[0];
                let txOut = utxoItem[1];

                if (bCheckDatum && (!txOut.datum)) {
                    continue;
                }

                let utxoValue = txOut.value;

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
                        console.log("formate asset amount: ", assetAmountObj);
                        amounts.push(assetAmountObj);
                    }
                }

                let txFilter = {
                    "txId": txIn.txId
                }
                console.log("CardanoServiceHandler...getAddressUtxosWithBlockHeight...txFilter: ", txFilter);
                let txInfo = await this.txInfoDbInst.findByOption(txFilter);
                console.log("CardanoServiceHandler...getAddressUtxosWithBlockHeight...txInfo: ", txInfo);

                let blockHeight = (0 < txInfo.length) ? txInfo[0].blockHeight : undefined;

                let formatedUtxo = {
                    "tx_hash": txIn.txId,
                    "tx_index": txIn.index,
                    "address": txOut.address,
                    "amount": amounts,
                    "data_hash": txOut.datum,
                    "datumHash": txOut.datumHash,
                    "script": txOut.script,
                    "blockHeight": blockHeight
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            return undefined;
        }

    }

    async getUtxosByAddress(reqOptions) {
        // console.log("\n\n .....getBlockByNo: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getUtxosByAddress...", reqOptions);
        let address = reqOptions.address;

        let bCheckDatum = (address === this.treasuryScCfg) ? true : false;

        try {

            let filter = new Array();
            filter.push(address);
            let utxoObjs = await this.queryClient.utxo(filter);
            console.log("\n\n .....utxoObjs: ", utxoObjs);

            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                let txIn = utxoItem[0];
                let txOut = utxoItem[1];

                if (bCheckDatum && (!txOut.datum)) {
                    continue;
                }

                let utxoValue = txOut.value;

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
                        console.log("formate asset amount: ", assetAmountObj);
                        amounts.push(assetAmountObj);
                    }
                }

                this.logUtilSrv.logInfo("CardanoServiceHandler", "...utxo datum...", txOut.datum);
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...utxo datumHash...", txOut.datumHash);

                let formatedUtxo = {
                    "tx_hash": txIn.txId,
                    "tx_index": txIn.index,
                    "address": txOut.address,
                    "amount": amounts,
                    "data_hash": txOut.datum,
                    "datumHash": txOut.datumHash,
                    "script": txOut.script
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...query utxo error...", e);

            return undefined;
        }
    }

    async queryGenesisConfig(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...queryGenesisConfig...", reqOptions);

        // get genesis config 
        try {
            let genesisConfig = await this.queryClient.genesisConfig();
            genesisConfig.maxLovelaceSupply = undefined;

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...queryGenesisConfig...", genesisConfig);
            return genesisConfig;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...queryGenesisConfig error...", e);
            return undefined;
        }
    }

    async queryEraSummaries(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...queryEraSummaries...", reqOptions);

        // get query eraSummaries 
        try {
            let eraSummaries = await this.queryClient.eraSummaries();

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...queryEraSummaries...", eraSummaries);
            return eraSummaries;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...queryEraSummaries error...", e);
            return undefined;
        }
    }

    async getBalanceByAddress(reqOptions) {
        console.log("\n\n .....getBalanceByAddress: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getBalanceByAddress...", reqOptions);
        let address = reqOptions.address;

        let bCheckDatum = (address === this.treasuryScCfg) ? true : false;

        try {
            let filter = new Array();
            filter.push(address);
            console.log("\n\n .....getBalanceByAddress filter: ", filter);
            let utxoObjs = await this.queryClient.utxo(filter);
            console.log("\n\n .....utxoObjs: ", utxoObjs);

            let assetBalanceArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                let txIn = utxoItem[0];
                let txOut = utxoItem[1];

                if (bCheckDatum && (!txOut.datum)) {
                    continue;
                }

                let utxoValue = txOut.value;
                let bTokenAsset = false;

                for (let key in utxoValue.assets) {
                    bTokenAsset = true;

                    let matchedId = undefined;
                    for (let index = 0; index < assetBalanceArray.length; index++) {
                        let assetItem = assetBalanceArray[index];
                        if (key === assetItem.unit) {
                            matchedId = index;
                            break;
                        }
                    }

                    let curAssetAmount = utxoValue.assets[key];
                    if (undefined === matchedId) {
                        let adaAmountObj = {
                            "unit": key,
                            "quantity": curAssetAmount.toString()
                        }
                        assetBalanceArray.push(adaAmountObj);

                    } else {
                        let curAmount = new BigNumber(curAssetAmount.toString());
                        let preAmount = new BigNumber(assetBalanceArray[matchedId].quantity);
                        let totalAmount = preAmount.plus(curAmount);

                        assetBalanceArray[matchedId].quantity = totalAmount.toString();
                    }
                }
                console.log("\n\n .....assetBalanceArray: ", assetBalanceArray);

                if (!bTokenAsset) {
                    let matchedIndex = undefined;
                    for (let index = 0; index < assetBalanceArray.length; index++) {
                        let assetItem = assetBalanceArray[index];
                        if ("lovelace" === assetItem.unit) {
                            matchedIndex = index;
                            break;
                        }
                    }

                    if (undefined === matchedIndex) {
                        let adaAmountObj = {
                            "unit": "lovelace",
                            "quantity": utxoValue.coins.toString()
                        }
                        assetBalanceArray.push(adaAmountObj);

                    } else {
                        let curAmount = new BigNumber(utxoValue.coins.toString());
                        let preAmount = new BigNumber(assetBalanceArray[matchedIndex].quantity);
                        let totalAmount = preAmount.plus(curAmount);

                        assetBalanceArray[matchedIndex].quantity = totalAmount.toString();
                    }
                }
            }

            return assetBalanceArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            return undefined;
        }
    }

    async getChainTip(reqOptions) {
        console.log("\n\n .....getChainTip reqOptions: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getChainTip...", reqOptions);

        // get latest block height 
        try {
            let chainTip = await this.queryClient.chainTip();
            console.log("\n\n .....getChainTip chainTip: ", chainTip);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getChainTip...", chainTip);
            return chainTip;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getChainTip error...", e);
            return undefined;
        }
    }

    async getCostModelParameters(reqOptions) {
        console.log("\n\n .....:getCostModelParameters ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getCostModelParameters...", reqOptions);

        // get latest block height 
        try {
            let curProtocalParams = await this.queryClient.currentProtocolParameters();
            console.log("\n\ncurProtocalParams: ", curProtocalParams);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getCostModelParameters...", curProtocalParams);
            return curProtocalParams;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getCostModelParameters error...", e);
            console.log("getCostModelParameters error: ", e);
            return undefined;
        }
    }

    async getCurProtocolParameters(reqOptions) {
        // console.log("\n\n .....getCurProtocolParameters: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getCurProtocolParameters...", reqOptions);

        await sleep(2*60000);

        try {
            let protocolParams = await this.queryClient.currentProtocolParameters();
            console.log('protocolParams:', protocolParams);

            // this.logUtilSrv.logInfo("CardanoServiceHandler", "...currentProtocolParameters...", protocolParams);
            let genesisConfig = await this.queryClient.genesisConfig();
            console.log('genesisConfig:', genesisConfig.protocolParameters);
            console.log('protocolParams:', protocolParams);

            let epochsParams = {
                "min_fee_a": JSON.stringify(protocolParams.minFeeCoefficient),
                "min_fee_b": JSON.stringify(protocolParams.minFeeConstant),
                "min_utxo": JSON.stringify(genesisConfig.protocolParameters.minUtxoValue),//?? protocolParams.,
                "coins_per_utxo_word": JSON.stringify(protocolParams.coinsPerUtxoByte * 2),
                "coins_per_utxo_byte": JSON.stringify(protocolParams.coinsPerUtxoByte),
                "price_mem": JSON.stringify(protocolParams.prices.memory),
                "price_step": JSON.stringify(protocolParams.prices.steps),
                "collateral_percent": JSON.stringify(protocolParams.collateralPercentage),
                "max_collateral_inputs": JSON.stringify(protocolParams.maxCollateralInputs),
                "pool_deposit": JSON.stringify(protocolParams.poolDeposit),
                "key_deposit": JSON.stringify(protocolParams.stakeKeyDeposit),
                "max_tx_size": JSON.stringify(protocolParams.maxTxSize),
                "max_val_size": JSON.stringify(protocolParams.maxValueSize),
            }
            return epochsParams;

        } catch (e) {
            console.log("query getCurProtocolParameters exception: ", e);
            return undefined;
        }
    }

    async submitTx(reqOptions) {
        console.log("\n\n .....submitTx: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...submitTx...", reqOptions.rawTx);

        try {

            let ret = await this.txSubmitClient.submitTx(reqOptions.rawTx);

            console.log("submitTx ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...submitTx...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...submitTx...failed:", error);
            console.log("submitTx failed: ", error);
            return undefined;
        }
    }

    async evaluateTx(reqOptions) {
        console.log("\n\n .....evaluateTx: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...evaluateTx...", reqOptions.rawTx);

        try {
            let ret = await this.txSubmitClient.evaluateTx(reqOptions.rawTx);

            console.log("evaluateTx ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...evaluateTx...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...evaluateTx...failed:", error);
            console.log("evaluateTx failed: ", error);
            return undefined;
        }
    }

    deriveAddress(reqOptions) {
        console.log("\n\n .....deriveAddress: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...deriveAddress...", reqOptions);

        let publicKey = reqOptions.publicKey;
        let addressIndex = reqOptions.addressIndex;
        let type = reqOptions.type;
        let isTestnet = reqOptions.isTestnet;

        const accountKey = CardanoWasm.Bip32PublicKey.from_bytes(Buffer.from(publicKey, 'hex'));
        const utxoPubKey = accountKey.derive(type).derive(addressIndex);
        const stakeKey = accountKey.derive(2).derive(0);

        const networkId = isTestnet
            ? CardanoWasm.NetworkInfo.testnet_preprod().network_id()
            : CardanoWasm.NetworkInfo.mainnet().network_id();

        const baseAddr = CardanoWasm.BaseAddress.new(networkId,
            CardanoWasm.Credential.from_keyhash(utxoPubKey.to_raw_key().hash()),
            CardanoWasm.Credential.from_keyhash(stakeKey.to_raw_key().hash()));

        let strPrefix = isTestnet ? "addr_test" : "addr";
        return {
            address: baseAddr.to_address().to_bech32(strPrefix),
            path: `m/1852'/1815'/0'/${type}/${addressIndex}`,
        };
    }

    async getTxRedeemers(reqOptions) {
        console.log("\n\n .....getTxRedeemers: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxRedeemers...", reqOptions);
        let txId = reqOptions.txId;
        let txRedeemers = undefined;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);

            for (let i = 0; i < txObjs.length; i++) {
                txRedeemers = txObjs[i].redeemers;
            }

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxRedeemers...", txRedeemers);
            return txRedeemers;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxRedeemers error...", e);
            return undefined;
        }
    }

    async getTxsMetadata(reqOptions) {
        console.log("\n\n .....getTxsMetadata: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsMetadata...", reqOptions);
        let txId = reqOptions.txId;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            // console.log("\n\n .....getTxsMetadata txObjs: ", txObjs);

            let metaDataAry = new Array();
            for (let i = 0; i < txObjs.length; i++) {
                if (undefined === txObjs[i].metaData) {
                    return [];
                }
                let txMetaDataObjs = txObjs[i].metaData.metaData;
                for (let j = 0; j < txMetaDataObjs.length; j++) {
                    metaDataAry.push(txMetaDataObjs[j]);
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsMetadata...", metaDataAry);
            return metaDataAry;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsMetadata error...", e);
            return undefined;
        }
    }

    async getTxUtxos(reqOptions) {
        console.log("\n\n .....getTxsUtxos: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsUtxos...", reqOptions);
        let txId = reqOptions.txId;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            console.log("\n\n .....getTxsUtxos txObjs: ", txObjs.length);

            let txUtxoObject = undefined;
            for (let i = 0; i < txObjs.length; i++) {
                // to get input utxo
                let subInputsAry = new Array();
                let txInputs = ("inputs" === txObjs[i].inputSource) ? txObjs[i].inputs : txObjs[i].collaterals;
                console.log("\n\n .....getTxsUtxos: ", reqOptions);
                for (let inIndex = 0; inIndex < txInputs.length; inIndex++) {
                    let inputObj = txInputs[inIndex];
                    let txFilter = {
                        "txId": inputObj.tx_hash
                    }
                    let txObjs = await this.txInfoDbInst.findByOption(txFilter);

                    let utxo_address = undefined;
                    let utxo_amount = undefined;
                    if (undefined !== txObjs[0]) {
                        let utxoObj = txObjs[0].outputs[inputObj.tx_index];
                        utxo_address = utxoObj.address;
                        utxo_amount = utxoObj.amount;
                    }

                    let subInputObj = {
                        "address": utxo_address,
                        "amount": utxo_amount,
                        "tx_hash": inputObj.tx_hash,
                        "output_index": inputObj.tx_index,
                        "data_hash": ""
                    }
                    subInputsAry.push(subInputObj);
                }

                // to get output utxo
                let subOutputsAry = new Array();

                /*let outputs = new Array();
                let outputLen = txObjs[i].outputs.length;
                if("inputs" === txObjs[i].inputSource){
                    for (let index = 0; index < (outputLen-1); index++) {
                        let item = txObjs[i].outputs[index];
                        outputs.push(item);
                    }
                }else{
                    let collateralOutput = txObjs[i].outputs[outputLen-1];
                    outputs.push(collateralOutput);
                }*/

                let outputs = txObjs[i].outputs;
                for (let outIndex = 0; outIndex < outputs.length; outIndex++) {
                    let outputObj = outputs[outIndex];
                    let subOutObj = {
                        "address": outputObj.address,
                        "amount": outputObj.amount,
                        "output_index": outIndex,
                        "data_hash": outputObj.datum,
                        "datumHash": outputObj.datumHash,
                        "script": outputObj.script
                    }
                    subOutputsAry.push(subOutObj);
                }

                txUtxoObject = {
                    "hash": txId,
                    "inputs": subInputsAry,
                    "outputs": subOutputsAry
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsUtxos...", txUtxoObject);
            return txUtxoObject;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsUtxos error...", e);
            return undefined;
        }
    }

    async getTxInfoById(reqOptions) {
        console.log("\n\n .....getTxInfoById: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxInfoById...", reqOptions);
        let txId = reqOptions.txId;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            console.log("\n\n .....getTxInfoById txObjs: ", txObjs.length);

            let txObject = undefined;
            for (let i = 0; i < txObjs.length; i++) {
                txObject = {
                    "hash": txId,
                    "block_height": txObjs[i].blockHeight,
                    "block": txObjs[i].blockHash,
                    "index": txObjs[i].txIndex,
                    "block_time": txObjs[i].time,
                    "mint": txObjs[i].mint,
                    "redeemers": txObjs[i].redeemers,
                    "inputSource": txObjs[i].inputSource,
                    "fee": txObjs[i].fee
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxInfoById...", txObject);
            return txObject;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxInfoById error...", e);
            return undefined;
        }
    }

    async getTxsByLabel(reqOptions) {
        console.log("\n\n .....getTxsByLabel: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxsByLabel...", reqOptions);
        let label = reqOptions.label;
        let from = reqOptions.from;
        let to = reqOptions.to;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < to) {
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, to);
                return undefined;
            }

            filter = {
                "metaData.metaData.label": label,
                "blockHeight": { "$gte": from, "$lte": to }
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            console.log("\n\n .....getTxsByLabel txObjs: ", txObjs.length);

            let txObjectAry = new Array();
            for (let i = 0; i < txObjs.length; i++) {
                let txObj = txObjs[i];

                for (let j = 0; j < txObj.metaData.metaData.length; j++) {
                    let metaData = txObj.metaData.metaData[j];
                    if (label === metaData.label) {
                        let txObject = {
                            "tx_hash": txObj.txId,
                            "json_metadata": metaData.json_metadata
                        }

                        txObjectAry.push(txObject);
                    }
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxInfoById...", txObjectAry);
            return txObjectAry;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getTxInfoById error...", e);
            return undefined;
        }

    }

    async getUtxoByTxIndex(reqOptions) {
        console.log("\n\n .....getUtxoByTxIndex: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getUtxoByTxIndex...", reqOptions);
        let txId = reqOptions.txId;
        let index = reqOptions.index;

        try {
            let filter = {
                "txId": txId
            }
            let txObjs = await this.txInfoDbInst.findAllByOption(filter);
            console.log("\n\n .....getUtxoByTxIndex txObjs: ", txObjs.length);

            let utxoObject = undefined;
            for (let i = 0; i < txObjs.length; i++) {

                // to get output utxo
                let outputs = txObjs[i].outputs;
                for (let outIndex = 0; outIndex < outputs.length; outIndex++) {

                    if (index === outIndex) {
                        let outputObj = outputs[outIndex];

                        utxoObject = {
                            "address": outputObj.address,
                            "amount": outputObj.amount,
                            "output_index": outIndex,
                            "data_hash": outputObj.datum,
                            "datumHash": outputObj.datumHash,
                            "script": outputObj.script
                        }

                        break;
                    }
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getUtxoByTxIndex...", utxoObject);
            return utxoObject;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getUtxoByTxIndex error...", e);
            return undefined;
        }
    }


    /////////////////////////////////////////
    //apis for plutus sdk
    /////////////////////////////////////////
    async getUTXOsByPlutusSdk(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetUTXOsByPlutusSdk...request:", reqOptions);
        //      let qryParams = reqOptions.qryParams;
        try {
            let utxoObjs = await this.queryClient.utxo(reqOptions);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetUTXOsByPlutusSdk...length:", utxoObjs.length);

            return utxoObjs;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetUTXOsByPlutusSdk...error: ", e);
            return undefined;
        }
    }

    async submitTxByPlutusSdk(reqOptions) {
        console.log("\n\n .....submitTxByPlutusSdk: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...submitTxByPlutusSdk...", reqOptions.rawTx);

        try {
            let ret = await this.txSubmitClient.submitTx(reqOptions.rawTx);

            console.log("handleGetUTXOsByPlutusSdk ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...submitTxByPlutusSdk...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...submitTxByPlutusSdk...failed:", error);
            console.log("submitTxByPlutusSdk failed: ", error);
            return error;
        }
    }

    async evaluateTxByPlutusSdk(reqOptions) {
        console.log("\n\n .....evaluateTxByPlutusSdk: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...evaluateTxByPlutusSdk...", reqOptions.rawTx);

        try {
            let ret = await this.txSubmitClient.evaluateTx(reqOptions.rawTx);

            console.log("evaluateTxByPlutusSdk ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...evaluateTxByPlutusSdk...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...evaluateTxByPlutusSdk...failed:", error);
            console.log("evaluateTxByPlutusSdk failed: ", error);
            return undefined;
        }
    }

    async getChainTipByPlutusSdk(reqOptions) {
        console.log("\n\n .....getChainTipByPlutusSdk reqOptions: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getChainTipByPlutusSdk...", reqOptions);

        // get latest block height 
        try {
            let chainTip = await this.queryClient.chainTip();
            console.log("\n\n .....getChainTipByPlutusSdk chainTip: ", chainTip);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getChainTipByPlutusSdk...", chainTip);
            return chainTip;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getChainTipByPlutusSdk error...", e);
            return e;
        }
    }

    async getCurProtocolParametersByPlutusSdk(reqOptions) {
        console.log("\n\n .....:getCurProtocolParametersByPlutusSdk ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getCurProtocolParametersByPlutusSdk...", reqOptions);

        // get latest block height 
        try {
            let curProtocalParams = await this.queryClient.currentProtocolParameters();
            console.log("\n\ncurProtocalParams: ", curProtocalParams);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getCurProtocolParametersByPlutusSdk...", curProtocalParams);
            return curProtocalParams;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getCurProtocolParametersByPlutusSdk error...", e);
            console.log("getCurProtocolParametersByPlutusSdk error: ", e);
            return e;
        }
    }

    async getGenesisConfigByPlutusSdk(reqOptions) {
        // console.log("\n\n .....getGenesisConfigByPlutusSdk: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getGenesisConfigByPlutusSdk...", reqOptions);

        try {
            let genesisConfig = await this.queryClient.genesisConfig();

            return genesisConfig;

        } catch (e) {
            console.log("query getGenesisConfigByPlutusSdk exception: ", e);
            return e;
        }
    }

    async getEraSummariesByPlutusSdk(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getEraSummariesByPlutusSdk...", reqOptions);

        // get query eraSummaries 
        try {
            let eraSummaries = await this.queryClient.eraSummaries();

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getEraSummariesByPlutusSdk...", eraSummaries);
            return eraSummaries;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getEraSummariesByPlutusSdk error...", e);
            return e;
        }
    }

    async getBlockHeightByPlutusSdk(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getBlockHeightByPlutusSdk...");

        // get query eraSummaries 
        try {
            let blockHeight = await this.queryClient.blockHeight();

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getBlockHeightByPlutusSdk...", blockHeight);
            return blockHeight;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getBlockHeightByPlutusSdk error...", e);
            return e;
        }
    }

    //delegationsAndRewards: (stakeKeyHashes: DigestBlake2BCredential[])
    async getDelegationsAndRewardsByPlutusSdk(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getDelegationsAndRewardsByPlutusSdk...");

        // get delegationsAndRewards 
        try {
            let ret = await this.queryClient.delegationsAndRewards(reqOptions);

            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getDelegationsAndRewardsByPlutusSdk...", ret);
            return ret;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getDelegationsAndRewardsByPlutusSdk error...", e);
            return e;
        }
    }

}

module.exports = CardanoServiceHandler;
