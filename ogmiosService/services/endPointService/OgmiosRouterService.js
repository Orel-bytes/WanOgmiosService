const EndPointServiceInterface = require("../../interfaces/EndPointServiceInterface");
const ServiceFramework = require("../../framework/ServiceFramework");
const CardanoServiceHandler = require("./CardanoServiceHandler");
const CardanoServiceMaestroHandler = require("./CardanoServiceMaestroHandler");

class OgmiosRouterService extends EndPointServiceInterface {

    /**
     *Creates an instance of OgmiosRouterService.
     * @memberof OgmiosRouterService
     */
    constructor() {
        super();
    }

    async init() {
        // to scan rp db records and to get the timeout rp
        this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
        this.storageSrvIns = ServiceFramework.getService("StorageServiceInterface", "StorageService");
        this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
        this.globalConstant = ServiceFramework.getService("GlobalConstantService", "GlobalConstant");

        this.bQueryDisable = await this.configService.getGlobalConfig("queryServiceDisable");
        
        // to initial rest request handler 
        let ogmiosVersion = await this.configService.getGlobalConfig("cardanoOgmiosVersion");
        this.serviceHandler = ("v6" === ogmiosVersion) ? new CardanoServiceMaestroHandler() : new CardanoServiceHandler();
        await this.serviceHandler.init();
    }

    async handlerRequest(router, postData) {
        let that = this;
        if (this.bQueryDisable) {
            this.logUtilSrv.logInfo("OgmiosRouterService", "...Stop Query Service...: ", this.bQueryDisable);
            // console.log(latestBlock);
            return undefined;
        }

        // console.log("\n\n router:" + router);
        this.logUtilSrv.logInfo("OgmiosRouterService", "...router...", router);
        this.logUtilSrv.logInfo("OgmiosRouterService", "...postData...", postData);

        if ('/getLatestBlock' == router) {
            // console.log("\n latestBlock:");
            let latestBlock = await that.handleGetLatestBlock(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...handleGetLatestBlock...", latestBlock);
            // console.log(latestBlock);
            return latestBlock;

        } else if ('/getBlock' == router) {
            // console.log("\n getBlock:");
            let block = await that.handleGetBlockByHeight(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...handleGetBlock...", block);
            return block;

        } else if ('/getAddressUTXOs' == router) {
            // console.log("\n getAddressUTXOs:");
            let utxos = await that.handleGetAddressUTXOs(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...handleGetAddressUTXOs...", utxos);
            // console.log("....getAddressUTXOs:", JSON.stringify(utxos));
            return utxos;

        } else if ('/getBalanceByAddress' == router) {
            // console.log("\n handleGetAddressBalance:");
            let addresBalance = await that.handleGetAddressBalance(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...handleGetAddressBalance...", addresBalance);
            // console.log("....handleGetAddressBalance:", JSON.stringify(addresBalance));
            return addresBalance;

        } else if ('/getTreasuryTx' == router) {
            // handleGetTreasuryTx
            let txIds = await that.handleGetTreasuryTx(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getTreasuryTx...", txIds);
            return txIds;

        } else if ('/getNFTTreasuryTx' == router) {
            // handleGetTreasuryTx
            let txIds = await that.handleGetNFTTreasuryTx(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getNFTTreasuryTx...", txIds);
            return txIds;

        } else if ('/getAddressTx' == router) {
            // console.log("\n getAddressTx:");
            let txIds = await that.handleGetAddressTx(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getAddressTx...", txIds);
            return txIds;

        } else if ('/getEpochsParameters' == router) {
            // console.log("\n getEpochsParameters:");

            // to get registed token info
            let epockParams = await that.handleGetEpochsParameters(postData);
            // console.log("\n epockParams:", epockParams);
            this.logUtilSrv.logInfo("OgmiosRouterService", "...epockParams...", epockParams);
            return epockParams;

        } else if ('/sendSignedTx' == router) {
            // console.log("\n sendSignedTx:");
            let rlst = await that.handleSendSignedTx(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...sendSignedTx...", rlst);
            // console.log(rlst);
            return rlst;

        } else if ('/getTxsMetadata' == router) {
            // console.log("\n sendSignedTx:");
            let rlst = await that.handleGetTxsMetadata(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getTxsMetadata...", rlst);
            // console.log(rlst);
            return rlst;

        } else if ('/getTxById' == router) {
            if (!postData) {
                return "getTxById options";
            }
            // console.log("\n getTxById:");
            let rlst = await that.handleGetTxInfoById(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getTxById...", rlst);
            // console.log(rlst);
            return rlst;

        } else if ('/getTxUtxos' == router) {
            // console.log("\n sendSignedTx:");
            if (!postData) {
                return "getTxUtxos options";
            }
            let rlst = await that.handleGetTxUtoxs(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getTxUtxos...", rlst);
            console.log(JSON.stringify(rlst));
            return rlst;

        } else if ('/deriveAddress' == router) {
            // console.log("\n deriveAddress:");
            let rlst = that.handleDeriveAddress(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...deriveAddress...", rlst);
            // console.log(rlst);  
            return rlst;

        } else if ('/getTxsBylabel' == router) {
            // console.log("\n getTxsBylabel:");
            let rlst = await that.handleGetTxsByLabel(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getTxsBylabel...", rlst);
            // console.log(rlst);  
            return rlst;

        } else if ('/getChainTip' == router) {
            // console.log("\n getTxsBylabel:");
            let rlst = await that.handleGetChainTip(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getChainTip...", rlst);
            // console.log(rlst);  
            return rlst;

        } else if ('/getCostModelParameters' == router) {
            console.log("\n......getCostModelParameters:  ");
            let rlst = await that.handleGetCostModelParameters(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../getCostModelParameters...", rlst);
            console.log("/getCostModelParameters rlst:", rlst);
            return rlst;

        } else if ('/getAssetMintage' == router) {
            console.log("\n......getAssetMintage:  ");
            let rlst = await that.handleGetAssetMintage(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../getAssetMintage...", rlst);
            console.log("/getAssetMintage rlst:", rlst);
            return rlst;

        } else if ('/getAssetMintInfo' == router) {
            console.log("\n......getAssetMintInfo:  ");
            let rlst = await that.handleGetAssetMintInfo(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../getAssetMintInfo...", rlst);
            console.log("/getAssetMintInfo rlst:", rlst);
            return rlst;

        } else if ('/getMintInfoByPolicyId' == router) {
            console.log("\n......getMintInfoByPolicyId:  ");
            let rlst = await that.handleGetMintInfoByPolicyId(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../getMintInfoByPolicyId...", rlst);
            console.log("/getMintInfoByPolicyId rlst:", rlst);
            return rlst;

        } else if ('/getNftMintInfo' == router) {
            console.log("\n......getNftMintInfo:  ");
            let rlst = await that.handleGetNftMintInfo(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../getNftMintInfo...", rlst);
            console.log("/getNftMintInfo rlst:", rlst);
            return rlst;

        } else if ('/getNftPolicyIds' == router) {
            console.log("\n......getNftPolicyIds:  ");
            let rlst = await that.handleGetNftPolicyIds(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../getNftPolicyIds...", rlst);
            console.log("/getNftPolicyIds rlst:", rlst);
            return rlst;

        } else if ('/getMsgTaskInfo' == router) {
            console.log("\n......getMsgTaskInfo:  ");
            let rlst = await that.handleGetMsgTaskInfo(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../getMsgTaskInfo...", rlst);
            console.log("/getMsgTaskInfo rlst:", rlst);
            return rlst;

        } else if ('/evaluateTx' == router) {
            console.log("\n......evaluateTx:  ");

            if (!postData) {
                return "evaluateTx options";
            }

            let rlst = await that.handleEvaluateTx(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../evaluateTx...", rlst);
            console.log("/evaluateTx rlst:", rlst);
            return rlst;

        } else if ('/getUtxoConsumedTx' == router) {
            console.log("\n......getUtxoConsumedTx:  ");
            let rlst = await that.handleGetUtxoConsumedTx(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../getUtxoConsumedTx...", rlst);
            console.log("/getUtxoConsumedTx rlst:", rlst);
            return rlst;

        } else if ('/checkUtxoAvailable' == router) {
            console.log("\n......checkUtxoAvailable:  ");
            let rlst = await that.handleCheckUtxoAvailable(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../checkUtxoAvailable...", rlst);
            console.log("/checkUtxoAvailable rlst:", rlst);
            return rlst;

        } else if ('/queryEraSummaries' == router) {
            console.log("\n......queryEraSummaries:  ");
            let rlst = await that.handleQueryEraSummaries(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../queryEraSummaries...", rlst);
            console.log("/queryEraSummaries rlst:", rlst);
            return rlst;

        } else if ('/queryGenesisConfig' == router) {
            console.log("\n......queryGenesisConfig:  ");
            let rlst = await that.handleQueryGenesisConfig(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../queryGenesisConfig...", rlst);
            console.log("/queryGenesisConfig rlst:", rlst);
            return rlst;

        } else if ('/getAddressUTXOsWithBlockHeight' == router) {
            // console.log("\n getAddressUTXOs:");
            let utxos = await that.handleGetAddressUTXOsWithBlockHeight(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...handleGetAddressUTXOsWithBlockHeight...", utxos);
            // console.log("....getAddressUTXOs:", JSON.stringify(utxos));
            return utxos;

        } else if ('/getBalancedConfig' == router) {
            console.log("\n......getBalancedConfig:  ");
            let rlst = await that.handleGetBalancedConfig(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", ".../getBalancedConfig...", rlst);
            console.log("/getBalancedConfig rlst:", rlst);
            return rlst;

        } else if ('/getUTXOs' == router) {
            if (!postData) {
                return "getUTXOs options";
            }

            // console.log("\n getAddressUTXOs:");
            let utxos = await that.handleGetUTXOs(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...handleGetUTXOs...", utxos);
            // console.log("....getAddressUTXOs:", JSON.stringify(utxos));
            return utxos;

        } else if ('/getUTXOsByPlutusSdk' == router) {
            // console.log("\n handleGetUTXOsByPlutusSdk:");
            let ret = await that.handleGetUTXOsByPlutusSdk(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...handleGetUTXOsByPlutusSdk...", ret);
            console.log("....handleGetUTXOsByPlutusSdk:", JSON.stringify(ret));
            return ret;

        } else if ('/getDelegationsAndRewardsByPlutusSdk' == router) {
            // console.log("\n handleGetDelegationsAndRewardsByPlutusSdk:");
            let ret = await that.handleGetDelegationsAndRewardsByPlutusSdk(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...handleGetDelegationsAndRewards...", ret);
            console.log("....handleGetDelegationsAndRewardsByPlutusSdk:", JSON.stringify(ret));
            return ret;

        } else if ('/getBlockHeightByPlutusSdk' == router) {
            // console.log("\n getBlockHeightByPlutusSdk:");
            let ret = await that.handleGetBlockHeightByPlutusSdk(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getBlockHeightByPlutusSdk...", ret);
            console.log("....getBlockHeightByPlutusSdk:", JSON.stringify(ret));
            return ret;

        } else if ('/getEraSummariesByPlutusSdk' == router) {
            // console.log("\n getEraSummariesByPlutusSdk:");
            let ret = await that.handleGetEraSummariesByPlutusSdk(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getEraSummariesByPlutusSdk...", ret);
            // console.log("....getEraSummariesByPlutusSdk:", JSON.stringify(ret));
            return ret;

        } else if ('/getGenesisConfigByPlutusSdk' == router) {
            // console.log("\n getGenesisConfigByPlutusSdk:");
            let ret = await that.handleGetGenesisConfigByPlutusSdk(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getGenesisConfigByPlutusSdk...", ret);
            // console.log("....getGenesisConfigByPlutusSdk:", JSON.stringify(ret));
            return ret;

        } else if ('/getCurProtocolParametersByPlutusSdk' == router) {
            // console.log("\n getCurProtocolParametersByPlutusSdk:");
            let ret = await that.handleGetCurProtocolParametersByPlutusSdk(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getCurProtocolParametersByPlutusSdk...", ret);
            // console.log("....getCurProtocolParametersByPlutusSdk:", JSON.stringify(ret));
            return ret;

        } else if ('/getChainTipByPlutusSdk' == router) {
            // console.log("\n getChainTipByPlutusSdk:");
            let ret = await that.handleGetChainTipByPlutusSdk(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...getChainTipByPlutusSdk...", ret);
            // console.log("....getChainTipByPlutusSdk:", JSON.stringify(ret));
            return ret;

        } else if ('/evaluateTxByPlutusSdk' == router) {
            // console.log("\n evaluateTxByPlutusSdk:");
            let ret = await that.handleEvaluateTxByPlutusSdk(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...evaluateTxByPlutusSdk...", ret);
            // console.log("....evaluateTxByPlutusSdk:", JSON.stringify(ret));
            return ret;

        } else if ('/submitTxByPlutusSdk' == router) {
            // console.log("\n submitTxByPlutusSdk:");
            let ret = await that.handleSubmitTxByPlutusSdk(postData);

            this.logUtilSrv.logInfo("OgmiosRouterService", "...submitTxByPlutusSdk...", ret);
            // console.log("....submitTxByPlutusSdk:", JSON.stringify(ret));
            return ret;

        } else {
            this.logUtilSrv.logError("OgmiosRouterService", "...Invalid Request!...", router);
            return "Invalid Request for Ogmios Service!";
        }
    }

    async handleGetUTXOsByPlutusSdk(postData) {
        console.log('\n\n ......handleGetUTXOsByPlutusSdk......: ', postData);
        let that = this;
        let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.getUTXOsByPlutusSdk(reqOption);
        console.log("....getUTXOsByPlutusSdk... ret:", JSON.stringify(ret));
        return ret;
    }

    async handleGetDelegationsAndRewardsByPlutusSdk(postData) {
        console.log('\n\n ......handleGetDelegationsAndRewardsByPlutusSdk......: ', postData);
        let that = this;
        let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.getDelegationsAndRewardsByPlutusSdk(reqOption);
        console.log("....getDelegationsAndRewardsByPlutusSdk... ret:", JSON.stringify(ret));
        return ret;
    }

    async handleGetBlockHeightByPlutusSdk(postData) {
        console.log('\n\n ......handleGetBlockHeightByPlutusSdk......: ', postData);
        let that = this;
        let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.getBlockHeightByPlutusSdk(reqOption);
        return ret;
    }

    async handleGetEraSummariesByPlutusSdk(postData) {
        console.log('\n\n ......handleGetEraSummariesByPlutusSdk......: ', postData);
        let that = this;
        let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.queryEraSummaries(reqOption); //getEraSummariesByPlutusSdk
        return ret;
    }

    async handleGetGenesisConfigByPlutusSdk(postData) {
        console.log('\n\n ......handleGetGenesisConfigByPlutusSdk......: ', postData);
        let that = this;
        let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.queryGenesisConfig(reqOption); // getGenesisConfigByPlutusSdk
        return ret;
    }

    async handleGetCurProtocolParametersByPlutusSdk(postData) {
        console.log('\n\n ......handleGetCurProtocolParametersByPlutusSdk......: ', postData);
        let that = this;
        let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.getCostModelParameters(reqOption); // getCurProtocolParametersByPlutusSdk
        return ret;
    }

    async handleGetChainTipByPlutusSdk(postData) {
        console.log('\n\n ......handleGetChainTipByPlutusSdk......: ', postData);
        let that = this;
        let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.getChainTip(reqOption); // getChainTipByPlutusSdk
        return ret;
    }

    async handleEvaluateTxByPlutusSdk(postData) {
        console.log('\n\n ......handleEvaluateTxByPlutusSdk......: ', postData);
        let that = this;
        // let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.evaluateTx(postData); //  evaluateTxByPlutusSdk
        return ret;
    }

    async handleSubmitTxByPlutusSdk(postData) {
        console.log('\n\n ......handleSubmitTxByPlutusSdk......: ', postData);
        let that = this;
        // let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.submitTx(postData); //  submitTxByPlutusSdk
        return ret;
    }

    /////////////////////////////////////
    //Part 2: apis for common use
    /////////////////////////////////////
    async handleGetUTXOs(postData) {
        console.log('\n\n ......handleGetUtxos......: ', postData);
        let that = this;
        let reqOption = JSON.parse(postData);

        let ret = await that.serviceHandler.handleGetUtxos(reqOption);
        return ret;
    }

    async handleGetBalancedConfig(postData) {
        console.log('\n\n ......handleGetBalancedConfig......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.handleGetBalancedConfig(reqOption);
        return ret;
    }

    async handleGetAddressUTXOsWithBlockHeight(postData) {
        let that = this;
        // console.log('\n\n ......getAddressUTXOs......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getAddressUtxosWithBlockHeight(reqOption);
        return result;
    }

    async handleQueryEraSummaries(postData) {
        console.log('\n\n ......handleQueryEraSummaries......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.queryEraSummaries(reqOption);
        return ret;
    }

    async handleQueryGenesisConfig(postData) {
        console.log('\n\n ......handleQueryGenesisConfig......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.queryGenesisConfig(reqOption);
        return ret;
    }

    async handleCheckUtxoAvailable(postData) {
        console.log('\n\n ......handleCheckUtxoAvailable......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.checkUtxoAvailable(reqOption);
        return ret;
    }

    async handleGetUtxoConsumedTx(postData) {
        console.log('\n\n ......handleGetUtxoConsumedTx......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getUtxoConsumedTx(reqOption);
        return ret;
    }

    async handleEvaluateTx(postData) {
        console.log('\n\n ......handleEvaluateTx......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.evaluateTx(reqOption);
        return ret;
    }

    async handleGetMintInfoByPolicyId(postData) {
        console.log('\n\n ......handleGetMintInfoByPolicyId......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getMintInfoByPolicyId(reqOption);
        return ret;
    }

    async handleGetNftMintInfo(postData) {
        console.log('\n\n ......handleGetNftMintInfo......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getNftMintInfo(reqOption);
        return ret;
    }

    async handleGetNftPolicyIds(postData) {
        console.log('\n\n ......handleGetNftPolicyIds......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getNftPolicyIds(reqOption);
        return ret;
    }

    async handleGetMsgTaskInfo(postData) {
        console.log('\n\n ......handleGetMsgTaskInfo......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getMsgTaskInfo(reqOption);
        return ret;
    }

    async handleGetAssetMintInfo(postData) {
        console.log('\n\n ......handleGetAssetMintInfo......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getAssetMintInfo(reqOption);
        return ret;
    }

    async handleGetAssetMintage(postData) {
        console.log('\n\n ......handleGetAssetMintage......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getAssetMintage(reqOption);
        return ret;
    }

    async handleGetCostModelParameters(postData) {
        console.log('\n\n ......handleGetCostModelParameters......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getCostModelParameters(reqOption);
        return ret;
    }

    async handleGetChainTip(postData) {
        console.log('\n\n ......handleGetChainTip......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getChainTip(reqOption);
        return ret;
    }

    async handleGetTxsByLabel(postData) {
        // console.log('\n\n ......handleGetTxsByLabel......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getTxsByLabel(reqOption);
        return ret;
    }

    async handleGetTxInfoById(postData) {
        // console.log('\n\n ......handleGetTxInfoById......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getTxInfoById(reqOption);
        return ret;
    }


    async handleGetLatestBlock(postData) {
        console.log('\n\n ......getLatestBlock......');
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let ret = await that.serviceHandler.getLatestBlock(reqOption);
        return ret;
    }

    async handleGetBlockByHeight(postData) {
        let that = this;
        // console.log('\n\n ......handleGetBlockByHeight......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getBlockByNo(reqOption);
        // console.log(result);
        return result;
    }

    async handleGetAddressTx(postData) {
        let that = this;
        // console.log('\n\n ......handleGetAddressTx......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getTxsByBlockHeight(reqOption);
        return result;
    }

    async handleGetTreasuryTx(postData) {

        let that = this;
        // console.log('\n\n ......handleGetAddressTx......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getTreasuryTxsByBlockNo(reqOption);
        return result;
    }

    async handleGetNFTTreasuryTx(postData) {

        let that = this;
        // console.log('\n\n ......handleGetAddressTx......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getNFTTreasuryTxsByBlockNo(reqOption);
        return result;
    }

    async handleGetAddressUTXOs(postData) {
        let that = this;
        // console.log('\n\n ......getAddressUTXOs......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getUtxosByAddress(reqOption);
        return result;
    }

    async handleGetTxsMetadata(postData) {
        let that = this;
        // console.log('\n\n ......getTxsMetadata......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getTxsMetadata(reqOption);
        return result;
    }

    async handleGetTxUtoxs(postData) {
        let that = this;
        // console.log('\n\n ......getTxUtxos......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getTxUtxos(reqOption);
        return result;
    }

    async handleGetAddressBalance(postData) {
        let that = this;
        console.log('\n\n ......getBalanceByAddress......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getBalanceByAddress(reqOption);
        return result;
    }

    async handleGetEpochsParameters(postData) {
        let that = this;
        // console.log('\n\n ......handleGetEpochsParameters......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = await that.serviceHandler.getCurProtocolParameters(reqOption);
        return result;
    }

    async handleSendSignedTx(postData) {
        let that = this;
        let reqOption = JSON.parse(postData);
        // console.log('\n\n ......handleSendSignedTx......', reqOption);

        let result = await that.serviceHandler.submitTx(reqOption);
        console.log('\n\n ......handleSendSignedTx......result: ', result);
        return result;
    }

    handleDeriveAddress(postData) {
        let that = this;
        // console.log('\n\n ......deriveAddress......');
        let reqOption = JSON.parse(postData);
        // console.log(reqOption);

        let result = that.serviceHandler.deriveAddress(reqOption);
        return result;
    }

}

module.exports = OgmiosRouterService;
