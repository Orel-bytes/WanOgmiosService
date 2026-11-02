const axios = require('axios');
const BigNumber = require('bignumber.js');

let testPath = "getAddressUTXOs";
let apiServer = "https://ogmios.wanchain.org";
let reqUrl = `${apiServer}/${testPath}`

async function testReq(){

        if ("getLatestBlock" === testPath) {
            const data = {
                name: 'John Doe',
                job: 'Content Writer'
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        }else if ("queryEraSummaries" === testPath) {
            const data = {
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("queryGenesisConfig" === testPath) {
            const data = {
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("checkUtxoAvailable" === testPath) {
            const data = {
                "txId" : "6c0eaae2966e9da211f49dc368375e52bb53720b26a6cd6494730a5af89b9c1a", 
                "index" : 0
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("getBlock" === testPath) {
            const data = {
                blockNo: 1052858
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("getAddressUTXOs" === testPath) {
            const data = {
                address: 'addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd'
            };

            let bgTs = Date.now();
            // console.log("\n\n...timestamp to request utxo : ", bgTs);

            axios.post(reqUrl, data)
                .then((res) => {
                    let edTs = Date.now();
                    console.log('get utxos length: ', res.data.length);

                    console.log("...timestamp to receive utxo : ", bgTs, edTs, edTs-bgTs);
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("getBalanceByAddress" === testPath) {
            const data = {
                address: 'addr_test1wp4v5rfz32tzkdthxhn4zvy5m4qexa8ghxlasv606y400ucjsz3lc'
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("getAddressTx" === testPath) {
            const data = {
                fromBlock: 943000,
                toBlock: 943200,
                address: "addr_test1vpvwllw7sgtkr5ftjk2ztwk84nc0dn8zm8l2j52su7cq35qzthv6u"
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        }  else if ("getTreasuryTx" === testPath) {
            const data = {
                fromBlock: 927000,
                toBlock: 928180,
                address: "addr_test1xpt89w6pdp53grd7kslttxtmcgpep7kkwkn5mh7sfuu388a5kavy3ppafpdrutclj4urwca0kkqqne0lg3xdu80a8cvs6ch5x0"
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("getEpochsParameters" === testPath) {
            const data = {
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                }); //getTxById
        } else if ("sendSignedTx" === testPath) {
            const data = {
                rawTx: 'John Doe'
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("evaluateTx" === testPath) {
            const data = {
                rawTx: '84ab00838258201132c1bfb691025083fb0e8a9e2ee52489973fa9b02092a3b64d672adf5589e7018258207c4a9adc1ce6895b7f288d953dba5a8f5d1604e1015b1f7d6f26e0bec8d69c8d00825820f859066f5e0dfb749cdedabda82a1ca4e64ebeb80eab9086e68d57d5187a592a000184a300581d70db61c8321aa7b8f1754b17379441bf469f0dc7523d27e48e9e9e14d901821a000df138a0028201d81845d8799f01ffa300581d70db32e243255f840792f922346c197c8e03f429c32fff30db18a627e901821a02285a58a0028201d81845d8799f01ff82583900e6da7b55ab70b0eef4154bc2d8cd80f4b504cf921f985512093d660aca6e70d3cead51d65be7fd05f5901d60080d29d2dbd3da61e728d8b8821a00200738a082583900b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19464578e1dcc55d0e9e8cf70c7afd5d2d48bf032123101941931e3e6b1a074aeb8c021a0010c704031a01846d0f07582071028ae2ec331d49ea0c2f8efd36791fd1d2fe0f9630d0114244263d9b9b53dd0b582051d0011108d4605ec73866187c8efb071ccaf9117887d52ca7acddade237a2740d81825820f859066f5e0dfb749cdedabda82a1ca4e64ebeb80eab9086e68d57d5187a592a000e81581c04cfd2f0ff625f9c54d212c7d0fadb4263b4c189ccd973b570f1d1fd1082583900b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19464578e1dcc55d0e9e8cf70c7afd5d2d48bf032123101941931e3e6b821a073a78c0a0111a002139d01285825820f1d79a03da040d62a90c0d27c0721b4c086a34f176b5e674bd08eae3476d0d1b008258201132c1bfb691025083fb0e8a9e2ee52489973fa9b02092a3b64d672adf5589e7018258204685a4d41b29d8a169b880e657b4bc61c68bd6c4e6437960978bf4f0d1b7da8a008258203ecd03140af7ac4c6756d6802c1434f74a234c95d72cf4d98cc6f6a872047fd2008258207c4a9adc1ce6895b7f288d953dba5a8f5d1604e1015b1f7d6f26e0bec8d69c8d00a30081825820d95d3f42204efe598586a210b1b56f447cee400af6bb6a0428fdc0263ce8d8165840058c462294dd1c672a3d58f291ffc5031249f0f5d46d723c097e344d203071a4df777fa6898698303d179c2f6e0b0388e558738f46e0ef4dfbe6426338a3170603800582840001d8799f581ce6da7b55ab70b0eef4154bc2d8cd80f4b504cf921f985512093d660a4040001a0020073858207c4a9adc1ce6895b7f288d953dba5a8f5d1604e1015b1f7d6f26e0bec8d69c8d000058203f559129ddb4ba4dde28226d837fa8082f12182bb5c70d21ee385b19558c0eed0058405eede6ae29c737bc920ca36c5c53287c4b7cdef0552654574ed4093316174c744184673e89ae3ba55cab1d78905360cf77ad7691ab2719ba44267b48c1e39370ff821a007396fd1aabaaba14840000d87980821a002f4d601a363d7f80f5a101a36b746f6b656e506169724944186e64747970650268756e69717565496458203f559129ddb4ba4dde28226d837fa8082f12182bb5c70d21ee385b19558c0eed'
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', res.data);
                }).catch((err) => {
                    console.error(err);
                });
        }  else if ("getTxById" === testPath) {
            const data = {
                txId: "123400d15c04ea39588d60603c904f7c4e309cdf5f167559e001e60140c43ebc"
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', JSON.stringify(res.data));
                }).catch((err) => {
                    console.error(err);
                });
        }  else if ("getTxUtxos" === testPath) {
            const data = {
                txId: "77b68f4ae6418497951446048ee0d89c7d2c1905e0561c2e8c83ed1b698e3e0f"
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', JSON.stringify(res.data));
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("getTxsMetadata" === testPath) {
            const data = {
                txId: "edfba990419743c29f0695e1fde51235c5e902af64e1cc09ff79f9a4a239fe9c"
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', JSON.stringify(res.data));
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("getMintInfoByPolicyId" === testPath) {
            const data = {       
                policyId: "dfd824ae6fc69aed5b37e908fcb52709b0e314de8cf323c5ce0335d8",
                beginBlockNo: 73756,
                endBlockNo: 74350
            };

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', JSON.stringify(res.data));
                }).catch((err) => {
                    console.error(err);
                });
        } else if ("getAssetMintage" === testPath) {
            const data = {       
                tokenId: "d5d25ef96acacaf5690e5549139645484796be537c149f0b4d48cfbf.57414e"
            };
        

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', JSON.stringify(res.data));

                }).catch((err) => {
                    console.error(err);
                });
        } else if ("getAssetMintInfo" === testPath) {
            const data = {       
                tokenId: "d5d25ef96acacaf5690e5549139645484796be537c149f0b4d48cfbf.57414e",
                beginBlockNo: 847685,
                endBlockNo: 848095
            };
        

            axios.post(reqUrl, data)
                .then((res) => {
                    console.log('Body: ', JSON.stringify(res.data));

                }).catch((err) => {
                    console.error(err);
                });
        }    
}

async function main(){


    let count = 0;
    while(count < 500){
        await testReq();

        count++;
    }
}

main();