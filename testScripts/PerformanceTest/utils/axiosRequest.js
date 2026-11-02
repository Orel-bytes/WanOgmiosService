const axios = require('axios');


class AxiosRequestUtil {

    constructor(apiServer){

        this.apiServer = apiServer; //"http://52.13.9.234:4337";

        this.mapAxiosRoute = new Map();
        this.mapAxiosRoute.set(0, "getCostModelParameters");
        this.mapAxiosRoute.set(1, "getLatestBlock");
        this.mapAxiosRoute.set(2, "getChainTip");
        this.mapAxiosRoute.set(3, "getBlock");
        this.mapAxiosRoute.set(4, "getAddressUTXOs");
        this.mapAxiosRoute.set(5, "getBalanceByAddress");
        this.mapAxiosRoute.set(6, "getAddressTx");
        this.mapAxiosRoute.set(7, "getEpochsParameters");
        this.mapAxiosRoute.set(8, "getTxUtxos");
        this.mapAxiosRoute.set(9, "getTxsMetadata");
        this.mapAxiosRoute.set(10, "getTxById");
    }

    async handleRequest(cmdId){

        let testPath = this.mapAxiosRoute.get(cmdId);
        let reqUrl = `${this.apiServer}/${testPath}`;

        return new Promise((resove, reject) => {


            if ("getCostModelParameters" === testPath) {
                const data = {
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getLatestBlock" === testPath) {
                const data = {
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getChainTip" === testPath) {
                const data = {
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getBlock" === testPath) {
                const data = {
                    blockNo: 292500,
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getAddressUTXOs" === testPath) {
                const data = {
                    address: 'addr_test1qz3ga6xtwkxn2aevf8jv0ygpq3cpseen68mcuz2fqe3lu0s9ag8xf2vwvdxtt6su2pn6h7rlnnnsqweavyqgd2ru3l3q09lq9e'
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getBalanceByAddress" === testPath) {
                const data = {
                    address: 'addr_test1wqvk30vqxcs5mgmda4pdnwa5p820qucnthjl08wjn9we0ycxn6ygm'
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getAddressTx" === testPath) {
                const data = {  
                    address: 'addr_test1qqem6l939hx82ylgxaha6wup6enz3v49p370st57g60ptzdc2uzuzuprg76cw3ggpy57ctlhldvuecpu4ufjard3q4esf4mqjz',
                    fromBlock: 407500,
                    toBlock: 407696
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getEpochsParameters" === testPath) {
                const data = {
                    "epochNo": 18
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getTxUtxos" === testPath) {
                const data = {
                    txId: "cf61f56ca35d19b6aeefa66af37f9555c8e6b0f647eb44fefe51b6d384108e8a"
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data); 
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getTxsMetadata" === testPath) {
                const data = {
                    txId: "494bd67d0ad4a7a68f8dee6283f9221d394ca4dec300eeac010cbf6862961d8d"
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', JSON.stringify(res.data));
                        return resove(JSON.stringify(res.data));
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getTxById" === testPath) {
                const data = {
                    txId: "cf61f56ca35d19b6aeefa66af37f9555c8e6b0f647eb44fefe51b6d384108e8a"
                };

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getUtxoByTxIndex" === testPath) {
                const data = {
                    txId: "edfba990419743c29f0695e1fde51235c5e902af64e1cc09ff79f9a4a239fe9c",
                    index: 1
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            } else if ("getTxsBylabel" === testPath) {
                let data = {
                    "label": "5718350",
                    "from": 407091,
                    "to":  307091 
                };
                console.log("req: ", reqUrl, data);

                axios.post(reqUrl, data)
                    .then((res) => {
                        console.log('Body: ', res.data);
                        return resove(res.data);
                    }).catch((err) => {
                        console.error(err);
                        return reject(undefined);
                    });
            }
        });
    }

};


module.exports = AxiosRequestUtil;

