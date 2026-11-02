const ServiceFramework = require("../../framework/ServiceFramework");
const axios = require("axios");

class MaestroChecker {

    constructor(serviceCfg) {
        this.MaestroCfg = serviceCfg;
    }

    init() {

        this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");

        this.url = this.MaestroCfg.url;
        this.apiKey = this.MaestroCfg.ApiKey;
    }

    buildReqOption(request) {
        let reqObject = request.object;
        let reqOption = request.option;
        let reqUrl = this.url + "/" + reqObject + "/" + reqOption;

        let requestConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: reqUrl,
            headers: {
                'Accept': 'application/json',
                'api-key': this.apiKey
            }
        };

        return requestConfig;
    }


    async confirmTxSecurity(txHash, blockHash, blockHeight) {
        console.log("\n\n...MaestroChecker...confirmTxSecurity: ", txHash, blockHash, blockHeight);
        if ((undefined === txHash)
            || (undefined === blockHash)
            || (undefined === blockHeight)) {

            this.logUtilSrv.logInfo('MaestroChecker', 'confirmTxSecurity...invalid params');
            return false;
        }

        let txInfo = undefined;
        try {
            let curTsBeforeCheck = Date.now();

            let reqestInfo = {
                "object": "transactions",
                "option": txHash
            };
            let reqOption = this.buildReqOption(reqestInfo);
            console.log("...reqOption: ", reqOption);

            let response = await axios.get(reqOption.url, reqOption);
            if (200 !== response.status) {
                return false;
            }

            txInfo = response.data.data;
            // console.log('\n\nMaestroTxChecker...confirmTxSecurity...response: ', txInfo);

            let curTsAfterCheck = Date.now();
            this.logUtilSrv.logInfo('...MaestroChecker', "confirmTxSecurity ...cost: ", curTsAfterCheck - curTsBeforeCheck);

        } catch (e) {
            this.logUtilSrv.logInfo('MaestroChecker', 'confirmTxSecurity...get tx error:', txHash);
            this.logUtilSrv.logInfo('MaestroChecker', 'confirmTxSecurity...get tx error:', e);
            return false;
        }

        if ((blockHash === txInfo.block_hash)
            && (blockHeight === txInfo.block_height)) {
            this.logUtilSrv.logInfo('MaestroChecker', 'confirmTxSecurity...succeed: ', txHash);
            return true;
        }

        this.logUtilSrv.logInfo('MaestroChecker', 'confirmTxSecurity...failed: ', txHash);
        return false;
    }


    async confirmBlockSecurity(blockHash, blockHeight) {
        if ((undefined === blockHash) || (undefined === blockHeight)) {

            this.logUtilSrv.logInfo('MaestroChecker', 'confirmBlockSecurity...invalid params');
            return false;
        }

        let blockInfo = undefined;
        try {
            let curTsBeforeCheck = Date.now();

            let reqestInfo = {
                "object": "blocks",
                "option": blockHeight
            };
            let reqOption = this.buildReqOption(reqestInfo);
            console.log("...reqOption: ", reqOption);
            let response = await axios.get(reqOption.url, reqOption);
            if (200 !== response.status) {
                return false;
            }

            blockInfo = response.data.data;
            console.log('\n\nMaestroTxChecker...confirmBlockSecurity...blockInfo: ', blockInfo);

            let curTsAfterCheck = Date.now();
            this.logUtilSrv.logInfo('...MaestroChecker', "confirmBlockSecurity...cost: ", curTsAfterCheck - curTsBeforeCheck);

        } catch (e) {
            this.logUtilSrv.logInfo('MaestroChecker', 'confirmBlockSecurity...get block error:', blockHeight);
            this.logUtilSrv.logInfo('MaestroChecker', 'confirmBlockSecurity...get block error:', e);
            return false;
        }

        if (blockHash === blockInfo.hash) {
            this.logUtilSrv.logInfo('MaestroChecker', 'confirmBlockSecurity...succeed: ', blockHeight);
            return true;
        }

        this.logUtilSrv.logInfo('MaestroChecker', 'confirmBlockSecurity...failed: ', blockHeight);
        return false;
    }


    async confirmUtxoSecurity(address, txId, index) {
        if ((undefined === address)
            || (undefined === txId)
            || (undefined === index)) {

            this.logUtilSrv.logInfo('MaestroChecker', 'confirmUtxoSecurity...invalid params');
            return false;
        }

        let utxoRefs = undefined;
        try {
            let curTsBeforeCheck = Date.now();

            let reqestInfo = {
                "object": "addresses",
                "option": `${address}/utxo_refs`
            };
            let reqOption = this.buildReqOption(reqestInfo);
            console.log("...reqOption: ", reqOption);
            let response = await axios.get(reqOption.url, reqOption);
            if (200 !== response.status) {
                return false;
            }

            utxoRefs = response.data.data;
            console.log('\n\nMaestroTxChecker...confirmUtxoSecurity...utxoRefs: ', utxoRefs);

            let curTsAfterCheck = Date.now();
            this.logUtilSrv.logInfo('...MaestroChecker', "confirmUtxoSecurity...cost: ", curTsAfterCheck - curTsBeforeCheck);

        } catch (e) {
            this.logUtilSrv.logInfo('MaestroChecker', 'confirmUtxoSecurity...get utxo refs failed:', address, txId, index);
            this.logUtilSrv.logInfo('MaestroChecker', 'confirmUtxoSecurity...get utxo refs error:', e);
            return false;
        }

        for (let i = 0; i < utxoRefs.length; i++) {
            let txHash = utxoRefs[i].tx_hash;
            let outputIndex = utxoRefs[i].index;

            if ((txHash === txId) && (outputIndex === index)) {
                this.logUtilSrv.logInfo('MaestroChecker', 'confirmUtxoSecurity...succeed: ', address, txId, index);
                return true;
            }
        }

        this.logUtilSrv.logInfo('MaestroChecker', 'confirmUtxoSecurity...failed: ', address, txId, index);
        return false;
    }

}

module.exports = MaestroChecker;
