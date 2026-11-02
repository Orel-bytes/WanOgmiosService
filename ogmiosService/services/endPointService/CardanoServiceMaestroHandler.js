const ServiceFramework = require("../../framework/ServiceFramework");
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const BigNumber = require('bignumber.js');
const {
    createInteractionContext,
    createLedgerStateQueryClient,
    createTransactionSubmissionClient
} = require('@cardano-ogmios/client');

const {
    convertMaestroUtxoAmount,
    convertMaestroProtocolParams,
    convertMaestroEraSummariesInfo,
    convertMaestroGenesisConfig,
    convertMaestroRedeemers,
    convertMaestroEvaluateRet,
    convertMaestroUtxoScriptInfo,
    convertMaestroEvaluateRet4PlutusSdk,
    convertIndexApiEvaluateRet,
    convertBlockFrostEvaluateRet,
    sleep
} = require("../utilService/commonUtils");

const IndexApiClient = require("./IndexApiClient");
const BlockForstClient = require("./BlockfrostClient");
// const { sleep } = require("promisefy-util");

const UtxoStatus_SecurityConfirmFailed = -2;
const UtxoStatus_Consumed = -1;
const UtxoStatus_PendingAvailable = 0;
const UtxoStatus_Available = 1;

class CardanoServiceMaestroHandler {

    constructor() {
        console.log("\n\n\n... instance CardanoServiceMaestroHandler...");

        this.ogmiosAccessStatic = {
            "totalNum": 0,
            "successNum": 0,
            "failedNum": 0,
            "curTs": Date.now() / 1000
        };

        this.mapMem4Config = new Map();
    }

    async init() {
        console.log("\n\n\n... init CardanoServiceMaestroHandler...");
        // to scan rp db records and to get the timeout rp
        this.storageSrvIns = ServiceFramework.getService("StorageServiceInterface", "StorageService");
        this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
        this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
        this.securityConfirmSrv = ServiceFramework.getService("AgentServiceInterface", "SecurityConfirmService");
        this.cacheManager = ServiceFramework.getService("CacheDataManagerInterface", "CacheDataManagerService");
        this.utxoCacheManager = ServiceFramework.getService("UtxoCacheManagerInterface", "UtxoCacheManagerService");

        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...init...", "Step 1");

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
        this.preGroupHolderAddress = await this.configService.getGlobalConfig("preGroupHolderAddress");
        this.curGroupHolderAddress = await this.configService.getGlobalConfig("curGroupHolderAddress");
        this.nftMetaHolderAddress = await this.configService.getGlobalConfig("nftMetaHolderAddress");

        // add cache data
        this.cacheDataConfig = await this.configService.getGlobalConfig("cacheDataConfig");
        this.cacheDataValidDuration = await this.configService.getGlobalConfig("cacheDataValidDuration");  //

        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...init...", "Step 2");

        this.dataSourceType = await this.configService.getGlobalConfig("dataSourceType");
        if (2 === this.dataSourceType) {
            // add index-api query client
            let indexApiCfg = await this.configService.getGlobalConfig("indexApiCfg");
            this.indexApiClient = new IndexApiClient(indexApiCfg);

        } else if (3 === this.dataSourceType) {
            this.securityConfirmCfg = await this.configService.getConfig("AgentServiceInterface", "AgentService", "SecurityConfirmCfg");
            let blockfrostCfg = this.securityConfirmCfg.blockFrostConfig;
            this.blockfrostClient = new BlockForstClient(blockfrostCfg, this.logUtilSrv);

        } else {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...init...", "Step 3");
            this.ogmiosServerConfig = await this.configService.getGlobalConfig("ogmiosServerCfg");
            await this.connectOgmiosNode();
        }

        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...init...", "Step 4");
        this.groupHolderUtxos = new Array();

        this.extraDelayBlockNum = 30;
    }

    byteArray2Hexstring(byteArray) {
        return Array.from(byteArray, function (byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('')
    }

    async reconnectOgmiosNode() {
        this.logUtilSrv.logInfo("\n\n***CardanoServiceMaestroHandler", "need to reconnectOgmiosNode.. ");
        setTimeout(async () => {
            try {
                await this.connectOgmiosNode();
            } catch (error) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...reconnectOgmiosNode...error...", error);
                await sleep(1000);
                this.reconnectOgmiosNode();
            }
        }, 10000);
    }

    async connectOgmiosNode() {

            
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...connectOgmiosNode...", "Ogmios 1");

        let connectionOption = (undefined === this.ogmiosServerConfig.apiKey) ? {
            host: this.ogmiosServerConfig.host,
            port: this.ogmiosServerConfig.port,
      	    tls: true
        } : {
            host: this.ogmiosServerConfig.host,
            port: this.ogmiosServerConfig.port,
            tls: true,
            apiKey: this.ogmiosServerConfig.apiKey
        }
            
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...connectOgmiosNode...", "Ogmios 2");

        this.context = await createInteractionContext(this.errorHandler.bind(this),
            this.closeHandler.bind(this),
            {
                connection: connectionOption,
                interactionType: 'LongRunning'
            });


        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...connectOgmiosNode...", "Ogmios 3");
        try {
            this.queryClient = await createLedgerStateQueryClient(this.context);
            //        (await this.queryClient.networkTip()).slot;
        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...createLedgerStateQueryClient...error", e);
        }


        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...connectOgmiosNode...", "Ogmios 4");
        this.addSuccessOgmiosAccess();
        try {
            // tx submit client
            this.txSubmitClient = await createTransactionSubmissionClient(this.context);

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...connectOgmiosNode...", "Ogmios 5");
        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...createTransactionSubmissionClient...error", e);
        }
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

    addSuccessOgmiosAccess() {
        this.ogmiosAccessStatic.successNum++;
        this.ogmiosAccessStatic.totalNum++;
        let curTs = Date.now() / 1000;
        if ((curTs - this.ogmiosAccessStatic.curTs) >= 600) {
            this.ogmiosAccessStatic.curTs = curTs;
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...ogmiosAccessStatic:", this.ogmiosAccessStatic);
        }
    }

    addFailedOgmiosAccess() {
        this.ogmiosAccessStatic.failedNum++;
        this.ogmiosAccessStatic.totalNum++;
        let curTs = Date.now() / 1000;
        if ((curTs - this.ogmiosAccessStatic.curTs) >= 600) {
            this.ogmiosAccessStatic.curTs = curTs;
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...ogmiosAccessStatic:", this.ogmiosAccessStatic);
        }
    }

    async handleGetUtxos(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...request:", reqOptions);
        //      let qryParams = reqOptions.qryParams;
        if ((undefined === reqOptions) || (undefined === reqOptions[0])) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...reqOptions is invalid: ", reqOptions);
            return undefined;
        }

        try {
            let txInAry = new Array();
            for (let i = 0; i < reqOptions.length; i++) {
                let txInItem = {
                    "transaction": {
                        "id": reqOptions[i].txId,
                    },
                    "index": reqOptions[i].index
                };
                txInAry.push(txInItem);
            }

            let utxoFilter = {
                "outputReferences": txInAry
            }

            let utxoObjs = undefined;
            if (2 === this.dataSourceType) {
                // need to caculate the access count 
                utxoObjs = await this.indexApiClient.query_utxo_by_output_reference_ary(txInAry);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...getUtxo from", "indexApi");

            } else if (3 === this.dataSourceType) {
                utxoObjs = await this.blockfrostClient.queryUtxosByRef(txInAry);
                // convert blockfrost utxoInfo to format utxoInfor
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...getUtxo from", "blockfrost");

            } else {
                utxoObjs = await this.queryClient.utxo(utxoFilter);
                this.addSuccessOgmiosAccess();
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...getUtxo from", "goMaestro");
            }

            if (undefined === utxoObjs) {
                return undefined;
            }
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...length:", utxoObjs.length);

            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                if (undefined === utxoItem) {
                    this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...utxo data error: ", utxoItem);
                    return undefined;
                }
                let amounts = convertMaestroUtxoAmount(utxoItem.value);
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetUtxos utxo datum...", utxoItem.datum);
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...handleGetUtxos utxo datumHash...", utxoItem.datumHash);

                let formatedUtxo = {
                    "tx_hash": utxoItem.transaction.id,
                    "tx_index": utxoItem.index,
                    "output_index": utxoItem.index,
                    "address": utxoItem.address,
                    "amount": amounts,
                    "data_hash": utxoItem.datum,
                    "datumHash": utxoItem.datumHash,
                    "script": convertMaestroUtxoScriptInfo(utxoItem.script)
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...error: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async handleGetBalancedConfig(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetBalancedConfig...", reqOptions);

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };
            let balancedCfgInfo = await this.balancedCfgInfoDbInst.findByOption(filter);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetBalancedConfig...", balancedCfgInfo);

            if (balancedCfgInfo.length > 0) {
                return balancedCfgInfo[0];
            }
            return undefined;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetBalancedConfig error...", e);
            return undefined;
        }
    }

    async getMintInfoByPolicyId(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getMintInfoByPolicyId...", reqOptions);
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
                "tokenId": {
                    "$regex": reqOptions.policyId
                },
                "blockHeight": {
                    "$gte": reqOptions.beginBlockNo,
                    "$lte": reqOptions.endBlockNo
                }
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getMintInfoByPolicyId...", reqOptions.policyId, assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getMintInfoByPolicyId error...", e);
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

    async getNftPolicyIds(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNftPolicyIds...", reqOptions);

        // get latest block height 
        try {
            let filter = {
                "checkTokenType": 2
            };

            let ret = await this.policyIdDbInst.findAllByOption(filter);
            if (0 === ret.length) {
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNftPolicyIds...", "no any policyId is selected");
                return [];
            } else {
                let nftPolicyIds = ret[0].policyIds;
                this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNftPolicyIds...", nftPolicyIds);
                return nftPolicyIds;
            }

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceHandler", "...getNftPolicyIds error...", e);
            return undefined;
        }
    }

    async getNftMintInfo(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNftMintInfo...", reqOptions);
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
                "bMintedNFT": true
            };
            let assetMintRecords = await this.mintInfoDbInst.findAllByOption(filter);

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNftMintInfo...ret", assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNftMintInfo error...", e);
            return undefined;
        }
    }

    async getAssetMintInfo(reqOptions) {

        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintInfo...", reqOptions);

        // get latest block height 
        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < reqOptions.endBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, reqOptions.endBlockNo);
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

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintInfo...", reqOptions.tokenId, assetMintRecords);
            return assetMintRecords;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintInfo error...", e);
            return undefined;
        }
    }

    async getAssetMintage(reqOptions) {

        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintage...", reqOptions);

        const maxDelayBlockNum = 10;
        let subFilter = {
            "tokenId": reqOptions.tokenId
        };
        let latestBlockPoint = await this.blockHeightDbInst.findByOption(subFilter);
        let maxRecordBlockId = latestBlockPoint[0].blockHeight - maxDelayBlockNum;
        if (0 >= maxRecordBlockId) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintage...the latest block is less than 10: ", latestBlockPoint[0].blockHeight);
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
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...get asset mint record...", tmpRecord);
                if (tmpRecord.blockHeight > maxRecordBlockId) {
                    break;
                }

                let mintValue = new BigNumber(tmpRecord.mintValue);
                totalMintage = totalMintage.plus(mintValue);
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintage...", reqOptions.tokenId, totalMintage.toString());
            return totalMintage.toString();

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAssetMintage error...", e);
            return undefined;
        }

    }

    async getLatestBlock(reqOptions) {
        console.log("\n\n .....getLatestBlock reqOptions: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getLatestBlock...", reqOptions);

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
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryRslt...", blockObj);
            return blockObj;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getLatestBlock error...", e);
            return undefined;
        }
    }

    async getBlockByNo(reqOptions) {
        // console.log("\n\n .....getBlockByNo: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockByNo...", reqOptions);
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
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryRslt...", blockObj);
            return blockObj;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockByNo error...", e);
            return undefined;
        }
    }

    async checkUtxoAvailable(reqOptions) {
        console.log("\n\n .....checkUtxoAvailable: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable...", reqOptions);
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
                "transaction": {
                    "id": txId,
                },
                "index": txIndex
            };
            txInAry.push(txInItem);
            let utxoFilter = {
                "outputReferences": txInAry
            }
            console.log("\n\n .....queryClient utxoFilter: ", utxoFilter);
            // TODO: to check get utxo by txId 
            // to query utxo on-chain 
            let rets = undefined;
            if (2 === this.dataSourceType) {
                rets = await this.indexApiClient.query_utxo_by_output_reference_ary(txInAry);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable...getUtxoByIndex from", "indexApi");

            } else if (3 === this.dataSourceType) {
                rets = await this.blockfrostClient.queryUtxosByRef(txInAry);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...handleGetUtxos...getUtxo from", "blockfrost");

            } else {
                rets = await this.queryClient.utxo(utxoFilter);
                this.addSuccessOgmiosAccess();
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable...getUtxoByIndex from", "goMaestro");
            }

            if (undefined === rets) {
                return undefined;
            }
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable...getUtxoByIndex rets:", rets.length);

            for (let ipId = 0; ipId < rets.length; ipId++) {
                let retUtxoObj = rets[ipId];

                let addressAry = new Array();
                let address = retUtxoObj.address;
                if (this.preGroupHolderAddress.includes(address)) {
                    address = this.curGroupHolderAddress;
                }
                addressAry.push(address);

                let filter = {
                    "addresses": addressAry
                }

                let utxoObjs = await this.utxoCacheManager.getUtxo(addressAry);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable...getUtxo: ", utxoObjs);

                for (let i = 0; i < utxoObjs.length; i++) {
                    let utxoItem = utxoObjs[i];

                    if ((txId === utxoItem.transaction.id) && (txIndex === utxoItem.index)) {
                        let secCheckRet = await this.securityConfirmSrv.confirmUtxoSecurity(utxoItem.address, txId, txIndex);
                        if (false === secCheckRet) {
                            return undefined;
                        }
                        return UtxoStatus_Available;
                    }
                }
            }

            // this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable...", consumedTxs);
            return UtxoStatus_Consumed;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...checkUtxoAvailable error...", e);

            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getUtxoConsumedTx(reqOptions) {
        console.log("\n\n .....getUtxoConsumedTx: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoConsumedTx...", reqOptions);
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

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoConsumedTx...", consumedTxs);
            return consumedTxs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoConsumedTx error...", e);
            return undefined;
        }
    }

    async getNFTTreasuryTxsByBlockNo(reqOptions) {
        console.log("\n\n .....getNFTTreasuryTxsByBlockNo: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNFTTreasuryTxsByBlockNo...", reqOptions);
        let fromBlockNo = reqOptions.fromBlock;
        let toBlockNo = reqOptions.toBlock;
        let maxPageTxNum = 100;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < toBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, toBlockNo);
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
                                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNFTTreasuryTxsByBlockNo with unconfirmed treasury tx: ", blockObjs[i].blockHeight);
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


            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNFTTreasuryTxsByBlockNo...", txs);
            return txs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getNFTTreasuryTxsByBlockNo error...", e);
            return undefined;
        }
    }

    async getTreasuryTxsByBlockNo(reqOptions) {
        console.log("\n\n .....getTreasuryTxsByBlockNo: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTreasuryTxsByBlockNo...", reqOptions);
        let fromBlockNo = reqOptions.fromBlock;
        let toBlockNo = reqOptions.toBlock;
        let maxPageTxNum = 100;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < toBlockNo) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, toBlockNo);
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
                console.log("\n\n .....getTreasuryTxsByBlockNo blockObjs: ", blockObjs.length);

                for (let i = 0; i < blockObjs.length; i++) {

                    let subTxs = blockObjs[i].blockTxs;
                    for (let j = 0; j < subTxs.length; j++) {

                        let bTreasuryRelateTx = subTxs[j].treasury_related;
                        let bSecurityConfirmed = subTxs[j].security_Confirmed;
                        console.log("\n\n .....getTreasuryTxsByBlockNo tx: ", blockObjs[i].blockHeight, j, subTxs[j]);
                        if (bTreasuryRelateTx) {
                            if (!bSecurityConfirmed) {
                                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTreasuryTxsByBlockNo with unconfirmed treasury tx: ", blockObjs[i].blockHeight);
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


            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTreasuryTxsByBlockNo...", txs);
            return txs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTreasuryTxsByBlockNo error...", e);
            return undefined;
        }
    }

    async getTxsByBlockHeight(reqOptions) {
        console.log("\n\n .....getTxsByBlockHeight: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsByBlockHeight...", reqOptions);
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
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, toBlockNo);
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

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsByBlockHeight...", txs);
            console.log("\n\n total retlated tx: ", txs.length);
            return txs;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsByBlockHeight error...", e);
            return undefined;
        }
    }

    async getAddressUtxosWithBlockHeight(reqOptions) {
        // console.log("\n\n .....getBlockByNo: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAddressUtxosWithBlockHeight...", reqOptions);
        let address = reqOptions.address;
        let bCheckDatum = (address === this.treasuryScCfg) ? true : false;

        try {
            let addressAry = new Array();
            if (this.preGroupHolderAddress.includes(address)) {
                address = this.curGroupHolderAddress;
            }
            addressAry.push(address);

            let filter = {
                "addresses": addressAry
            }

            let utxoObjs = await this.utxoCacheManager.getUtxo(addressAry);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getAddressUtxosWithBlockHeight...getUtxo: ", utxoObjs);

            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];

                if (bCheckDatum && (!utxoItem.datum)) {
                    continue;
                }

                // to block this utxo in preprod network
                if ((("bdef9922147b1615ff17e3ef04753e4c5c72db77ba10e37bcad27f1aaa83910d" === utxoItem.transaction.id) && (0 === utxoItem.index))
                    || (("7c6df57bb005aaa600a19de8e9a22e4c9d3897301e10f2dd4af2dacc1b3af24c" === utxoItem.transaction.id) && (0 === utxoItem.index))
                    || (("2f3b4c3799c6befa9f5da7ad00d27d7cf9e1a5f8312207dc4352aeec595f8a16" === utxoItem.transaction.id) && (0 === utxoItem.index))) {
                    continue;
                }


                let amounts = convertMaestroUtxoAmount(utxoItem.value);

                let txFilter = {
                    "txId": utxoItem.transaction.id
                }
                console.log("CardanoServiceMaestroHandler...getAddressUtxosWithBlockHeight...txFilter: ", txFilter);
                let txInfo = await this.txInfoDbInst.findByOption(txFilter);
                console.log("CardanoServiceMaestroHandler...getAddressUtxosWithBlockHeight...txInfo: ", txInfo);

                let blockHeight = (0 < txInfo.length) ? txInfo[0].blockHeight : undefined;

                let formatedUtxo = {
                    "tx_hash": utxoItem.transaction.id,
                    "tx_index": utxoItem.index,
                    "output_index": utxoItem.index,
                    "address": utxoItem.address,
                    "amount": amounts,
                    "data_hash": utxoItem.datum,
                    "datumHash": utxoItem.datumHash,
                    "script": convertMaestroUtxoScriptInfo(utxoItem.script),
                    "blockHeight": blockHeight
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);

            this.addFailedOgmiosAccess();
            return undefined;
        }

    }

    async getUtxosByAddress(reqOptions) {
        // console.log("\n\n .....getBlockByNo: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxosByAddress...", reqOptions);
        let address = reqOptions.address;

        let bCheckDatum = (address === this.treasuryScCfg) ? true : false;
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxosByAddress..preGroupHolderAddress...", this.preGroupHolderAddress);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxosByAddress..curGroupHolderAddress...", this.curGroupHolderAddress);

        if (this.nftMetaHolderAddress === address) {
            const refetchGap = 60000;
            let lastRecord = this.mapMem4Config.get("NftMetaHolder");
            if (undefined !== lastRecord) {
                let curTs = Date.now();
                let lastTs = lastRecord.curTs;
                let curGap = curTs - lastTs;
                if (refetchGap > curGap) {
                    return lastRecord.utxos;
                }
            }
        }

        try {
            let addressAry = new Array();
            if (this.preGroupHolderAddress.includes(address)) {
                address = this.curGroupHolderAddress;
            }
            addressAry.push(address);

            let filter = {
                "addresses": addressAry
            }
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxosByAddress..filter...", filter);

            let utxoObjs = await this.utxoCacheManager.getUtxo(addressAry);
            console.log("CardanoServiceMaestroHandler...getUtxosByAddress..ret...", utxoObjs);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxosByAddress..ret...", utxoObjs);
            if (undefined === utxoObjs) {
                return utxoObjs;
            }


            let formatedUtxoArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];

                if (bCheckDatum && (!utxoItem.datum)) {
                    continue;
                }

                // to block this utxo in preprod network
                if ((("bdef9922147b1615ff17e3ef04753e4c5c72db77ba10e37bcad27f1aaa83910d" === utxoItem.transaction.id) && (0 === utxoItem.index))
                    || (("7c6df57bb005aaa600a19de8e9a22e4c9d3897301e10f2dd4af2dacc1b3af24c" === utxoItem.transaction.id) && (0 === utxoItem.index))
                    || (("2f3b4c3799c6befa9f5da7ad00d27d7cf9e1a5f8312207dc4352aeec595f8a16" === utxoItem.transaction.id) && (0 === utxoItem.index))) {
                    continue;
                }


                let amounts = convertMaestroUtxoAmount(utxoItem.value);

                let formatedUtxo = {
                    "tx_hash": utxoItem.transaction.id,
                    "tx_index": utxoItem.index,
                    "output_index": utxoItem.index,
                    "address": utxoItem.address,
                    "amount": amounts,
                    "data_hash": utxoItem.datum,
                    "datumHash": utxoItem.datumHash,
                    "script": utxoItem.script ? convertMaestroUtxoScriptInfo(utxoItem.script) : undefined
                }
                formatedUtxoArray.push(formatedUtxo);
            }

            let curTs = Date.now();
            let curRecord = {
                "curTs": curTs,
                "utxos": formatedUtxoArray
            }
            this.mapMem4Config.set("NftMetaHolder", curRecord);

            return formatedUtxoArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...query utxo error...", e);

            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async queryGenesisConfig(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryGenesisConfig...", reqOptions);

        // get genesis config 
        try {
            // let maestroGenesisConfig = await this.queryClient.genesisConfiguration('shelley');
            // let genesisConfig = convertMaestroGenesisConfig(maestroGenesisConfig);
            // genesisConfig.maxLovelaceSupply = undefined;
            // this.addSuccessOgmiosAccess();
            let cacheRecord = this.cacheManager.getCacheDataByName(this.cacheDataConfig.GenesisConfig);
            if (undefined === cacheRecord) {
                return undefined;
            }

            let curTs = Date.now();
            let durationTs = curTs - cacheRecord.ts;
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...Genesis cacheData durationTs...", durationTs);
            if (this.cacheDataValidDuration < durationTs) {
                return undefined;
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryGenesisConfig...ret:", cacheRecord.data);
            return cacheRecord.data;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryGenesisConfig error...", e);

            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async queryEraSummaries(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryEraSummaries...", reqOptions);

        // get query eraSummaries 
        try {
            // let maestroEraSummaries = await this.queryClient.eraSummaries();
            // let eraSummaries = convertMaestroEraSummariesInfo(maestroEraSummaries);
            // this.addSuccessOgmiosAccess();
            let cacheRecord = this.cacheManager.getCacheDataByName(this.cacheDataConfig.EraSummaries);
            if (undefined === cacheRecord) {
                return undefined;
            }

            let curTs = Date.now();
            let durationTs = curTs - cacheRecord.ts;
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...eraSummaries cacheData durationTs...", durationTs);
            if (this.cacheDataValidDuration < durationTs) {
                return undefined;
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryEraSummaries...ret:", cacheRecord.data);
            return cacheRecord.data;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...queryEraSummaries error...", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getBalanceByAddress(reqOptions) {
        console.log("\n\n .....getBalanceByAddress: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBalanceByAddress...", reqOptions);
        let address = reqOptions.address;

        let bCheckDatum = (address === this.treasuryScCfg) ? true : false;

        try {
            let addressAry = new Array();
            if (this.preGroupHolderAddress.includes(address)) {
                address = this.curGroupHolderAddress;
            }
            addressAry.push(address);

            let filter = {
                "addresses": addressAry
            }
            console.log("\n\n .....getBalanceByAddress filter: ", filter);

            let utxoObjs = await this.utxoCacheManager.getUtxo(addressAry);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBalanceByAddress..ret...", utxoObjs);

            let assetBalanceArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                console.log("\n\n .....utxo item: ", utxoItem);
                if (bCheckDatum && (!utxoItem.datum)) {
                    continue;
                }

                let assetsValue = utxoItem.value;
                for (let key in assetsValue) {
                    let policyTokens = assetsValue[key];
                    let adaAmountArray = new Array();
                    let bTokenAsset = false;

                    if ("ada" === key) {
                        let adaAmountObj = {
                            "unit": "lovelace",
                            "quantity": policyTokens["lovelace"].toString()
                        }
                        adaAmountArray.push(adaAmountObj);
                        console.log("..add asset: ", adaAmountObj);

                    } else {
                        bTokenAsset = true;
                        let policyId = key;

                        for (let name in policyTokens) {
                            let tokenName = policyId + "." + name;
                            let tokenAmount = policyTokens[name];
                            console.log("token unit: ", tokenName);
                            console.log("token amunt: ", tokenAmount.toString());

                            let matchedIndex = undefined;
                            for (let index = 0; index < assetBalanceArray.length; index++) {
                                let assetItem = assetBalanceArray[index];
                                if (tokenName === assetItem.unit) {
                                    matchedIndex = index;
                                    break;
                                }
                            }

                            if (undefined === matchedIndex) {
                                let tokenAmountObj = {
                                    "unit": tokenName,
                                    "quantity": tokenAmount.toString(),
                                    "utxoNum": 1
                                }
                                assetBalanceArray.push(tokenAmountObj);

                            } else {
                                let utxoNum = assetBalanceArray[matchedIndex].utxoNum;
                                let savedAssetAmount = assetBalanceArray[matchedIndex].quantity;
                                console.log("\n..savedAssetAmount: ", tokenName, savedAssetAmount);

                                let curAmount = new BigNumber(tokenAmount);
                                let preAmount = new BigNumber(savedAssetAmount);
                                let totalAmount = preAmount.plus(curAmount);
                                console.log("..updated AssetAmount: ", tokenName, totalAmount.toString());

                                assetBalanceArray[matchedIndex].quantity = totalAmount.toString();
                                assetBalanceArray[matchedIndex].utxoNum = utxoNum + 1;
                            }
                        }
                    }

                    if (!bTokenAsset) {

                        let curAmount = new BigNumber("0");
                        for (let i = 0; i < adaAmountArray.length; i++) {
                            let itemAmount = new BigNumber(adaAmountArray[i].quantity);
                            curAmount = curAmount.plus(itemAmount);
                        }

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
                                "quantity": curAmount.toString(),
                                "utxoNum": 1
                            }
                            assetBalanceArray.push(adaAmountObj);

                        } else {
                            let utxoNum = assetBalanceArray[matchedIndex].utxoNum;
                            let preAmount = new BigNumber(assetBalanceArray[matchedIndex].quantity);
                            let totalAmount = preAmount.plus(curAmount);

                            assetBalanceArray[matchedIndex].quantity = totalAmount.toString();
                            assetBalanceArray[matchedIndex].utxoNum = utxoNum + 1;
                        }
                    }
                }
            }


            return assetBalanceArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getChainTip(reqOptions) {
        console.log("\n\n .....getChainTip reqOptions: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getChainTip...", reqOptions);

        // get latest block height 
        try {
            // let chainTip = await this.queryClient.networkTip();
            // chainTip.hash = chainTip.id;
            let cacheRecord = this.cacheManager.getCacheDataByName(this.cacheDataConfig.ChainTip);
            if (undefined === cacheRecord) {
                return undefined;
            }

            let curTs = Date.now();
            let durationTs = curTs - cacheRecord.ts;
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...ChainTip cacheData durationTs...", durationTs);
            if (30000 < durationTs) { //different duration for different item 
                return undefined;
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getChainTip...ret:", cacheRecord.data);
            return cacheRecord.data;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getChainTip error...", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getCostModelParameters(reqOptions) {
        console.log("\n\n .....:getCostModelParameters ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCostModelParameters...", reqOptions);

        // get latest block height 
        try {
            // let maestroProtocolParams = await this.queryClient.protocolParameters();
            // let curProtocalParams = convertMaestroProtocolParams(maestroProtocolParams);
            let cacheRecord = this.cacheManager.getCacheDataByName(this.cacheDataConfig.ProtocolParams);
            if (undefined === cacheRecord) {
                console.log("\n\n...there no cache record in dataManager");
                return undefined;
            }

            let curTs = Date.now();
            let durationTs = curTs - cacheRecord.ts;
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...CostModelParameters cacheData durationTs...", durationTs);
            if (this.cacheDataValidDuration < durationTs) {
                return undefined;
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCostModelParameters...ret:", cacheRecord.data);
            return cacheRecord.data;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCostModelParameters error...", e);
            console.log("getCostModelParameters error: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getCurProtocolParameters(reqOptions) {
        // console.log("\n\n .....getCurProtocolParameters: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getCurProtocolParameters...", reqOptions);

        try {
            // let maestroProtocolParams = await this.queryClient.protocolParameters();
            // let protocolParams = convertMaestroProtocolParams(maestroProtocolParams);
            // console.log('protocolParams:', protocolParams);
            // this.addSuccessOgmiosAccess();

            // // this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...currentProtocolParameters...", protocolParams);
            // let maestroGenesisConfig = await this.queryClient.genesisConfiguration('shelley');
            // let genesisConfig = convertMaestroGenesisConfig(maestroGenesisConfig);
            // console.log('genesisConfig:', genesisConfig.protocolParameters);
            // console.log('protocolParams:', protocolParams);
            // this.addSuccessOgmiosAccess();

            // let epochsParams = {
            //     "min_fee_a": JSON.stringify(protocolParams.minFeeCoefficient),
            //     "min_fee_b": JSON.stringify(protocolParams.minFeeConstant),
            //     "min_utxo": JSON.stringify(genesisConfig.protocolParameters.minUtxoValue),//?? protocolParams.,
            //     "coins_per_utxo_word": JSON.stringify(protocolParams.coinsPerUtxoByte * 2),
            //     "coins_per_utxo_byte": JSON.stringify(protocolParams.coinsPerUtxoByte),
            //     "price_mem": JSON.stringify(protocolParams.prices.memory),
            //     "price_step": JSON.stringify(protocolParams.prices.steps),
            //     "collateral_percent": JSON.stringify(protocolParams.collateralPercentage),
            //     "max_collateral_inputs": JSON.stringify(protocolParams.maxCollateralInputs),
            //     "pool_deposit": JSON.stringify(protocolParams.poolDeposit),
            //     "key_deposit": JSON.stringify(protocolParams.stakeKeyDeposit),
            //     "max_tx_size": JSON.stringify(protocolParams.maxTxSize),
            //     "max_val_size": JSON.stringify(protocolParams.maxValueSize),
            //     "min_fee_ref_script_cost_per_byte": JSON.stringify(protocolParams.minFeeRefScriptCostPerByte),
            //     "minFeeRefScriptCostPerByte": JSON.stringify(protocolParams.minFeeRefScriptCostPerByte)
            // }

            let cacheRecord = this.cacheManager.getCacheDataByName(this.cacheDataConfig.EpochsParams);
            if (undefined === cacheRecord) {
                return undefined;
            }

            let curTs = Date.now();
            let durationTs = curTs - cacheRecord.ts;
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...epochsParams cacheData durationTs...", durationTs);
            if (this.cacheDataValidDuration < durationTs) {
                return undefined;
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...epochsParams...ret:", cacheRecord.data);
            return cacheRecord.data;

        } catch (e) {
            console.log("query getCurProtocolParameters exception: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async submitTx(reqOptions) {
        console.log("\n\n .....submitTx: ", reqOptions);
        let rawTx = undefined;
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx...", reqOptions);
        if (undefined === reqOptions.rawTx) {
            rawTx = reqOptions;
        } else {
            rawTx = reqOptions.rawTx;
        }

        try {
            let ret = undefined;

            if (2 === this.dataSourceType) {
                ret = await this.indexApiClient.submitTx(rawTx);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx by indexAPI...", ret);
                return ret;
            } else if (3 === this.dataSourceType) {
                ret = await this.blockfrostClient.txSubmit(rawTx);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx by blockfrost...", ret);
                return ret;

            } else {
                ret = await this.txSubmitClient.submitTransaction(rawTx);
                this.addSuccessOgmiosAccess();
                if (undefined !== ret.transaction) {
                    console.log("submitTx ret: ", ret);
                    this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx by ogmios...", ret);
                    return ret.transaction.id;
                }
            }

            console.log("submitTx ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx...failed:", error);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...submitTx...failed:", JSON.stringify(error));
            console.log("submitTx failed: ", error);

            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async evaluateTx(reqOptions) {
        console.log("\n\n .....evaluateTx: ", reqOptions);
        let rawTx = undefined;
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx...", reqOptions);
        if (undefined === reqOptions.rawTx) {
            rawTx = reqOptions;
        } else {
            rawTx = reqOptions.rawTx;
        }
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx...", rawTx);

        try {
            let ret = undefined;

            if (2 === this.dataSourceType) {
                let indexApiRet = await this.indexApiClient.evaluateTx(rawTx);
                ret = convertIndexApiEvaluateRet(indexApiRet);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx by indexApi...", ret);
            } else if (3 === this.dataSourceType) {
                let blockfrostRet = await this.blockfrostClient.evaluateTx(rawTx);
                ret = convertBlockFrostEvaluateRet(blockfrostRet);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx by blockfrost...", ret);
            } else {
                let maestroRet = await this.txSubmitClient.evaluateTransaction(rawTx);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx by ogmios..ret.", maestroRet);
                ret = convertMaestroEvaluateRet(maestroRet);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx by ogmios...", ret);
            }

            this.addSuccessOgmiosAccess();
            console.log("evaluateTx ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTx...failed:", JSON.stringify(error));

            this.addFailedOgmiosAccess();

            let errCode = error.code;
            let message = "evaluateFailed";
            let data = undefined;
            if (undefined !== error.data[0]) {
                errCode = error.data[0].error.code;
                message = error.data[0].error.message;
                data = error.data[0].error.data;
            }

            let ret = {
                "errCode": errCode,
                "message": message,
                "data": data
            }

            return ret;
        }
    }

    async evaluateTxByPlutusSdk(reqOptions) {
        console.log("\n\n .....evaluateTxByPlutusSdk: ", reqOptions);
        let rawTx = undefined;
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk...", reqOptions);
        if (undefined === reqOptions.rawTx) {
            rawTx = reqOptions;
        } else {
            rawTx = reqOptions.rawTx;
        }
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk...", rawTx);

        try {
            let ret = undefined;

            if (2 === this.dataSourceType) {
                let indexApiRet = await this.indexApiClient.evaluateTx(rawTx);
                ret = convertIndexApiEvaluateRet(indexApiRet);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk by indexApi...", ret);
            } else if (3 === this.dataSourceType) {
                let blockfrostRet = await this.blockfrostClient.evaluateTx(rawTx);
                ret = convertBlockFrostEvaluateRet(blockfrostRet);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk by blockfrost...", ret);
            } else {
                let maestroRet = await this.txSubmitClient.evaluateTransaction(rawTx);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk by ogmios..ret.", maestroRet);
                ret = convertMaestroEvaluateRet(maestroRet);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk by ogmios...", ret);
            }

            this.addSuccessOgmiosAccess();
            console.log("evaluateTx ret: ", ret);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk...", ret);
            return ret;

        } catch (error) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...evaluateTxByPlutusSdk...failed:", JSON.stringify(error));
            return undefined;
        }
    }

    deriveAddress(reqOptions) {
        console.log("\n\n .....deriveAddress: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...deriveAddress...", reqOptions);

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
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxRedeemers...", reqOptions);
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

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxRedeemers...", txRedeemers);
            return txRedeemers;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxRedeemers error...", e);
            return undefined;
        }
    }

    async getTxsMetadata(reqOptions) {
        console.log("\n\n .....getTxsMetadata: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsMetadata...", reqOptions);
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

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsMetadata...", metaDataAry);
            return metaDataAry;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsMetadata error...", e);
            return undefined;
        }
    }

    async getTxUtxos(reqOptions) {
        console.log("\n\n .....getTxsUtxos: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsUtxos...", reqOptions);
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
                    let subInputObj = {
                        "address": inputObj.utxo_owner,
                        "amount": inputObj.utxo_amount ? inputObj.utxo_amount : inputObj.amount,
                        "tx_hash": inputObj.tx_hash,
                        "output_index": inputObj.tx_index,
                        "data_hash": ""
                    }
                    subInputsAry.push(subInputObj);
                }

                // to get output utxo
                let subOutputsAry = new Array();
                let outputs = txObjs[i].outputs;
                for (let outIndex = 0; outIndex < outputs.length; outIndex++) {
                    let outputObj = outputs[outIndex];
                    let subOutObj = {
                        "address": outputObj.address,
                        "amount": outputObj.amount,
                        "output_index": outIndex,
                        "data_hash": outputObj.datum,
                        "datumHash": outputObj.datumHash,
                        "script": convertMaestroUtxoScriptInfo(outputObj.script)
                    }
                    subOutputsAry.push(subOutObj);
                }

                txUtxoObject = {
                    "hash": txId,
                    "inputs": subInputsAry,
                    "outputs": subOutputsAry
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsUtxos...", txUtxoObject);
            return txUtxoObject;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsUtxos error...", e);
            return undefined;
        }
    }

    async getTxInfoById(reqOptions) {
        console.log("\n\n .....getTxInfoById: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById...", reqOptions);
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
                    "outputs": txObjs[i].outputs,
                    "mint": txObjs[i].mint,
                    "redeemers": txObjs[i].redeemers,
                    "inputSource": txObjs[i].inputSource,
                    "fee": txObjs[i].fee,
                    "bMintTask": txObjs[i].bMintTask,
                    "treasury_related": txObjs[i].treasury_related,
                    "bMintedNFT": txObjs[i].bMintedNFT,
                    "nftTreasury_related": txObjs[i].nftTreasury_related,
                    "bMsgTask": txObjs[i].bMsgTask
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById...", txObject);
            return txObject;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById error...", e);
            return undefined;
        }
    }

    async getTxsByLabel(reqOptions) {
        console.log("\n\n .....getTxsByLabel: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxsByLabel...", reqOptions);
        let label = reqOptions.label;
        let from = reqOptions.from;
        let to = reqOptions.to;

        try {
            let filter = {
                "chainType": "ADA"
            };
            let latestBlockPoint = await this.blockHeightDbInst.findByOption(filter);
            if (latestBlockPoint[0].blockHeight < to) {
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...to block is greater than latest block...", latestBlockPoint[0].blockHeight, to);
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

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById...", txObjectAry);
            return txObjectAry;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getTxInfoById error...", e);
            return undefined;
        }

    }

    async getUtxoByTxIndex(reqOptions) {
        console.log("\n\n .....getUtxoByTxIndex: ", reqOptions);
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoByTxIndex...", reqOptions);
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
                            "script": convertMaestroUtxoScriptInfo(outputObj.script)
                        }

                        break;
                    }
                }
            }

            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoByTxIndex...", utxoObject);
            return utxoObject;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUtxoByTxIndex error...", e);
            return undefined;
        }
    }

    /////////////////////////////////////////
    //apis for plutus sdk
    /////////////////////////////////////////
    async getUTXOsByPlutusSdk(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUTXOsByPlutusSdk...request:", reqOptions);
        //      let qryParams = reqOptions.qryParams;
        if ((undefined === reqOptions) || (undefined === reqOptions[0])) {
            return undefined;
        }

        try {
            let ret = undefined;
            let utxoFilter = new Array();
            if (undefined === reqOptions[0].txId) {
                for (let i = 0; i < reqOptions.length; i++) {
                    let address = reqOptions[i];
                    if (this.preGroupHolderAddress.includes(address)) {
                        address = this.curGroupHolderAddress;
                    }
                    utxoFilter.push(address);
                }
                ret = await this.utxoCacheManager.getUtxo(utxoFilter);

            } else {
                let txInAry = new Array();
                for (let i = 0; i < reqOptions.length; i++) {
                    let txInItem = {
                        "transaction": {
                            "id": reqOptions[i].txId,
                        },
                        "index": reqOptions[i].index
                    };
                    txInAry.push(txInItem);
                }
                let utxoFilter = {
                    "outputReferences": txInAry
                }

                if (2 === this.dataSourceType) {
                    // need to caculate the access count 
                    ret = await this.indexApiClient.query_utxo_by_output_reference_ary(txInAry);
                    this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUTXOsByPlutusSdk", "indexApi");
                } else if (3 === this.dataSourceType) {
                    ret = await this.blockfrostClient.queryUtxosByRef(txInAry);
                    this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUTXOsByPlutusSdk", "blockfrost");
                } else {
                    ret = await this.queryClient.utxo(utxoFilter);
                    this.addSuccessOgmiosAccess();
                    this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUTXOsByPlutusSdk", "goMaestro");
                }
            }
            console.log("\n\n .....getBalanceByAddress filter: ", utxoFilter);

            // let ret = await this.queryClient.utxo(filter);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUTXOsByPlutusSdk...length:", ret.length);
            this.addSuccessOgmiosAccess();

            let utxoObjs = new Array();
            for (let i = 0; i < ret.length; i++) {
                let utxoItem = ret[i];

                let script = convertMaestroUtxoScriptInfo(utxoItem.script);
                let formatedValueAry = convertMaestroUtxoAmount(utxoItem.value);

                let utxoValue = {
                    "coins": new BigNumber("0"),
                    "assets": {}
                };
                for (let j = 0; j < formatedValueAry.length; j++) {
                    let valueItem = formatedValueAry[j];
                    if ("lovelace" === valueItem.unit) {
                        let curAmount = new BigNumber(utxoValue.coins.toString());
                        let preAmount = new BigNumber(valueItem.quantity);
                        utxoValue.coins = preAmount.plus(curAmount);

                    } else {
                        let tokenAmount = utxoValue.assets[valueItem.unit];
                        if (undefined === tokenAmount) {
                            tokenAmount = new BigNumber("0");
                        }
                        let curAmount = new BigNumber(tokenAmount.toString());
                        let preAmount = new BigNumber(valueItem.quantity);
                        let updatedAmount = preAmount.plus(curAmount);

                        utxoValue.assets[valueItem.unit] = updatedAmount;
                    }
                }

                let utxoInput = {
                    "txId": utxoItem.transaction.id,
                    "index": utxoItem.index
                };

                let utxoOutput = {
                    "address": utxoItem.address,
                    "value": utxoValue,
                    "datumHash": utxoItem.datumHash,
                    "datum": utxoItem.datum,
                    "script": script
                };

                let utxoObj = new Array();
                utxoObj.push(utxoInput);
                utxoObj.push(utxoOutput);

                utxoObjs.push(utxoObj);
            }

            return utxoObjs;

        } catch (e) {
            console.log("query utxo exception: ", e);
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getUTXOsByPlutusSdk...error: ", e);
            this.addFailedOgmiosAccess();
            return undefined;
        }
    }

    async getBlockHeightByPlutusSdk(reqOptions) {
        // console.log("\n\n .....getLatestBlock: ");
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockHeightByPlutusSdk...");

        // get query eraSummaries 
        try {
            let blockHeight = undefined;
            if (2 === this.dataSourceType) {
                blockHeight = await this.indexApiClient.networkBlockHeight();
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockHeightByPlutusSdk...by indexAPI", blockHeight);
            } else if (3 === this.dataSourceType) {
                let latestBlock = await this.blockfrostClient.queryBlock();
                blockHeight = latestBlock.height;
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockHeightByPlutusSdk...by blockfrost", blockHeight);
            } else {
                blockHeight = await this.queryClient.networkBlockHeight();
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockHeightByPlutusSdk...by ogmios", blockHeight);
                this.addSuccessOgmiosAccess();
            }

            return blockHeight;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getBlockHeightByPlutusSdk error...", e);
            this.addFailedOgmiosAccess();
            return e;
        }
    }

    //delegationsAndRewards: (stakeKeyHashes: DigestBlake2BCredential[])
    async getDelegationsAndRewardsByPlutusSdk(reqOptions) {
        this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewardsByPlutusSdk...", reqOptions);
        if ((undefined === reqOptions) || (0 === reqOptions.length)) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewards invalid request...", reqOptions);
            return {};
        }

        // get delegationsAndRewards 
        try {

            let ret = {};
            if (2 === this.dataSourceType) {
                let indexApiRet = await this.indexApiClient.accountInfo(reqOptions[0]);
                let indexRet = {
                    "delegate": indexApiRet.delegated_pool,
                    "rewards": indexApiRet.rewards_available
                }
                ret[0] = indexRet;
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewards...from indexAPI", ret);

            } else if (3 === this.dataSourceType) {
                let blockfrostRet = await this.blockfrostClient.accountInfo(reqOptions[0]);
                ret[0] = blockfrostRet;
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewards...from blockfrost", ret);
            } else {
                let params = {
                    "scripts": reqOptions
                    // "keys": reqOptions
                }
                console.log("\n\n .....rewardAccountSummaries...params: ", params);

                let retSummaries = await this.queryClient.rewardAccountSummaries(params);
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewardsByPlutusSdk...retSummaries by ogmios", retSummaries);
                this.addSuccessOgmiosAccess();

                for (let i = 0; i < retSummaries.length; i++) {
                    let summObj = retSummaries[i];
                    let poolId = summObj.stakePool.id;
                    let strRewards = summObj.rewards.ada.lovelace.toString();
                    let intRewards = new BigNumber(strRewards).toNumber();

                    let ogmiosRet = {
                        "delegate": poolId,
                        "rewards": intRewards
                    }
                    ret[i] = ogmiosRet;
                }
                this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewards...from ogmios", ret);
            }

            return ret;

        } catch (e) {
            this.logUtilSrv.logInfo("CardanoServiceMaestroHandler", "...getDelegationsAndRewardsByPlutusSdk error...", e);
            this.addFailedOgmiosAccess();
            return e;
        }
    }

}

module.exports = CardanoServiceMaestroHandler;


