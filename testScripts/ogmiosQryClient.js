
const {
    createInteractionContext,
    createStateQueryClient,
    createTxSubmissionClient,
    TxSubmission
} = require('@cardano-ogmios/client');

const BigNumber = require('bignumber.js');

const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');



class OriginOgmios {

    // "https://nodes-testnet.wandevs.org
    constructor(){

        this.ogmiosServerConfig = {
            host: "nodes-testnet.wandevs.org",
            port: 1337
        };

    }

    async init() {
        await this.connectOgmiosNode();
    }

    async reconnectOgmiosNode(){
        setTimeout(async () => {
            try {
                await this.connectOgmiosNode();
            } catch (error) {
                console.log("CardanoServiceHandler...reconnectOgmiosNode...error...", error);
                this.reconnectOgmiosNode();
            }
        }, 10000);
    }

    async connectOgmiosNode(){
        this.context = await createInteractionContext(this.errorHandler.bind(this),
            this.closeHandler.bind(this),
            {
                connection: {
                    host: this.ogmiosServerConfig.host,
                    port: this.ogmiosServerConfig.port,
                    tls: true
                },
                interactionType: 'LongRunning'
            });

        //query client
        this.queryClient = await createStateQueryClient(this.context);
        (await this.queryClient.chainTip()).slot;

        // tx submit client
        this.txSubmitClient = await createTxSubmissionClient(this.context);
    }

    byteArray2Hexstring(byteArray) {
        return Array.from(byteArray, function (byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('')
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

    async getUtxosByAddress(address) {
        // console.log("\n\n .....getBlockByNo: ");
        console.log("CardanoServiceHandler...getUtxosByAddress...:", address);

        try {

            let filter = new Array();
            filter.push(address);
            let utxoObjs = await this.queryClient.utxo(filter);
            console.log("\n\n .....utxoObjs: ", utxoObjs);
            
            return utxoObjs;

        } catch (e) {
            console.log("query utxo by address exception: ", e);
            return undefined;
        }
    }


    async getBalanceByAddress(address) {
        // console.log("\n\n .....getBalanceByAddress: ");

        try {
            let filter = new Array();
            filter.push(address);
            let utxoObjs = await this.queryClient.utxo(filter);
            // console.log("\n\n .....utxoObjs: ", utxoObjs);

            let assetBalanceArray = new Array();
            for (let i = 0; i < utxoObjs.length; i++) {
                let utxoItem = utxoObjs[i];
                let txIn = utxoItem[0];
                let txOut = utxoItem[1];

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
                // console.log("\n\n .....assetBalanceArray: ", assetBalanceArray);

                if(!bTokenAsset){
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

            console.log("\n\n .....assetBalanceArray: ", assetBalanceArray);
            return assetBalanceArray;

        } catch (e) {
            console.log("query utxo exception: ", e);
            return undefined;
        }
    }

    async getUtxosByTxInfo(txId, txIndex){
        console.log("CardanoServiceHandler...getUtxosByTxInfo...:", txId, txIndex);    

        try {
            let txInAry = new Array();
            let txInItem = {
                "txId": txId,
                "index": txIndex
            };
            txInAry.push(txInItem);
            console.log("\n\n .....getUtxosByTxInfo txInAry: ", txInAry);
    
            // TODO: to check get utxo by txId 
            // to query utxo on-chain 
            let utxoObjs = await this.queryClient.utxo(txInAry);
            console.log("\n\n .....getUtxosByTxInfo...utxoObjs: ", utxoObjs);
            
            return utxoObjs;

        } catch (e) {
            console.log("query utxos by txInfo exception: ", e);
            return undefined;
        }

    }

}

async function main(){

    let ogmiosObj = new OriginOgmios();
    await ogmiosObj.init();

    let strAddr = "addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp";   
    await ogmiosObj.getBalanceByAddress(strAddr);


    // let txInfo = {
    //     txId: "c1528f59f8639721c0bbc964c441360a3592f0f61b21d2b4e34c189cb53cfb39",
    //     index: 0
    // };
    // await ogmiosObj.getUtxosByTxInfo(txInfo.txId, txInfo.index);


    let networkId = CardanoWasm.NetworkInfo.mainnet().network_id();
    console.log("mainnet netId: ", networkId);
    networkId = CardanoWasm.NetworkInfo.testnet().network_id();
    console.log("testnet netId: ", networkId);
    // networkId = CardanoWasm.NetworkInfo.testnet_preview().network_id();
    // console.log("testnet_preview netId: ", networkId);
}


main();



