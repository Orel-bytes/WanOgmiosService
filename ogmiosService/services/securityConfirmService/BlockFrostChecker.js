const ServiceFramework = require("../../framework/ServiceFramework");
const BlockFrostAPI = require('@blockfrost/blockfrost-js').BlockFrostAPI;
// const RetryObject = require('got').RetryObject; //{ RetryObject } from 'got';

class BlockFrostChecker {

    constructor(serviceCfg) {
        this.blockFrostCfg = serviceCfg;
    }

    init() {

        this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");

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
    }

    async fetchLatestBlock() {

        let latestBlock = undefined;
        try {
            let curTsBeforeCheck = Date.now();

            latestBlock = await this.blockFrostApi.blocksLatest();
            this.logUtilSrv.logInfo('\n\nBlockFrostTxChecker', 'fetchLatestBlock...latestBlock: ', latestBlock);

            let curTsAfterCheck = Date.now();
            this.logUtilSrv.logInfo('...BlockFrostChecker', "fetchLatestBlock ...latestBlock: ", curTsAfterCheck - curTsBeforeCheck);

        } catch (e) {
            this.logUtilSrv.logInfo('BlockFrostChecker', 'fetchLatestBlock get latestBlock error:', e);
            this.logUtilSrv.logInfo('BlockFrostChecker', 'fetchLatestBlock get latestBlock error:', e);
            return false;
        }
    }


    async confirmTxSecurity(txHash, blockHash, blockHeight) {
        if ((undefined === txHash)
            || (undefined === blockHash)
            || (undefined === blockHeight)) {

            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmTxSecurity...invalid params');
            return false;
        }

        let txInfo = undefined;
        try {
            let curTsBeforeCheck = Date.now();

            txInfo = await this.blockFrostApi.txs(txHash);
            this.logUtilSrv.logInfo('\n\nBlockFrostTxChecker', 'confirmTxSecurity...txInfo: ', txInfo);

            let curTsAfterCheck = Date.now();
            this.logUtilSrv.logInfo('...BlockFrostChecker', "confirmTxSecurity ...cost: ", curTsAfterCheck - curTsBeforeCheck);

        } catch (e) {
            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmTxSecurity...get tx error:', txHash);
            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmTxSecurity...get tx error:', e);
            return false;
        }

        if ((blockHash === txInfo.block)
            && (blockHeight === txInfo.block_height)) {
            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmTxSecurity...succeed: ', txHash);
            return true;
        }

        this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmTxSecurity...failed: ', txHash);
        return false;
    }


    async confirmBlockSecurity(blockHash, blockHeight) {
        if ((undefined === blockHash) || (undefined === blockHeight)) {

            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmBlockSecurity...invalid params');
            return false;
        }

        let blockInfo = undefined;
        try {
            let curTsBeforeCheck = Date.now();

            blockInfo = await this.blockFrostApi.blocks(blockHeight);
            this.logUtilSrv.logInfo('\n\nBlockFrostTxChecker', 'confirmBlockSecurity...blockInfo: ', blockInfo);

            let curTsAfterCheck = Date.now();
            this.logUtilSrv.logInfo('...BlockFrostChecker', "confirmBlockSecurity...cost: ", curTsAfterCheck - curTsBeforeCheck);

        } catch (e) {
            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmBlockSecurity...get block error:', blockHeight);
            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmBlockSecurity...get block error:', e);
            return false;
        }

        if (blockHash === blockInfo.hash) {
            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmBlockSecurity...succeed: ', blockHeight);
            return true;
        }

        this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmBlockSecurity...failed: ', blockHeight);
        return false;
    }


    async confirmUtxoSecurity(address, txId, index) {
        if ((undefined === address)
            || (undefined === txId)
            || (undefined === index)) {

            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmUtxoSecurity...invalid params');
            return false;
        }

        try {
            let pageIndex = 0;
            let itemCount = 100;

            do {
                let curTsBeforeCheck = Date.now();

                let paginationOptions = {
                    count: itemCount,
                    page: pageIndex,
                    order: 'asc'
                }
                let utxos = await this.blockFrostApi.addressesUtxos(address, paginationOptions);
                console.log('\n...confirmUtxoSecurity...utxos: ', pageIndex, utxos.length);

                let curTsAfterCheck = Date.now();
                console.log("confirmUtxoSecurity ...cost: ", curTsAfterCheck - curTsBeforeCheck);

                for (let i = 0; i < utxos.length; i++) {
                    let txHash = utxos[i].tx_hash;
                    let outputIndex = utxos[i].output_index;
                    if ((txHash === txId) && (outputIndex === index)) {
                        this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmUtxoSecurity...succeed: ', address, txId, index);
                        return true;
                    }
                }

                if (utxos.length < itemCount) {
                    break;
                } else {
                    pageIndex++;
                }

            } while (true);

        } catch (e) {
            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmUtxoSecurity...get utxo refs failed:', address, txId, index);
            this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmUtxoSecurity...get utxo refs error:', e);
            return false;
        }

        this.logUtilSrv.logInfo('BlockFrostChecker', 'confirmUtxoSecurity...failed: ', address, txId, index);
        return false;
    }

}

module.exports = BlockFrostChecker;
