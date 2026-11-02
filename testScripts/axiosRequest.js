const axios = require('axios');
const BigNumber = require('bignumber.js');
const minimist = require('minimist');
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');

// cmd format: --net=mainnet --route=getLatestBlock
const commandArgs = process.argv.slice(2);
const cmdParams = minimist(commandArgs);
console.log("\n\n...cmdParams: ", cmdParams);
const netType = cmdParams['net'];
const cmdRoute = cmdParams['route'];
// console.log("\n\n...cmdParams: ", netType, cmdRoute);

const mainnetBackUpUrl = "https://nodes.wandevs.org/cardano2";
const mainnetUrl = "https://nodes.wandevs.org/cardano";
const testnetUrl = "https://nodes-testnet.wandevs.org/cardano"; //"https://preprodogmios.wanchain.org/"; 
const apiServer = ("testnet" === netType) ? testnetUrl : ("mainnet" === netType) ? mainnetUrl : mainnetBackUpUrl;
const reqUrl = `${apiServer}/${cmdRoute}`

console.log("**...request url: ", reqUrl);

if ("getLatestBlock" === cmdRoute) {
    const data = {
        name: 'John Doe',
        job: 'Content Writer'
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);

            // let mapMem4Config = new Map();
            // let subMapMember = mapMem4Config.get("xx");
            // if(undefined === subMapMember){
            //     subMapMember = new Map();
            //     mapMem4Config.set("xx", subMapMember);
            // }
            // subMapMember.set("sex", "Male");
            // console.log("\n\n...xx's info", mapMem4Config.get("xx"));

        }).catch((err) => {
            console.error(err);
        });
} else if ("getNftMintInfo" === cmdRoute) {
    const data = {
        "beginBlockNo": 12315500,
        "endBlockNo": 12315580
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getChainTip Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getNftPolicyIds" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getNftPolicyIds Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getChainTip" === cmdRoute) {
    const data = {
    };

    let bgTs = Date.now();
    console.log("timestamp to request getChainTip : ", bgTs);

    let mapMem4Config = new Map();


    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getChainTip Body: ', res.data);
            let edTs = Date.now();
            console.log('Body: ',  JSON.stringify(res.data));

            let curTs = Date.now();
            console.log("curTs: ", curTs);
            let curRecord = {
                "curTs": curTs,
                "chainTip": res.data
            }
            mapMem4Config.set("ChainTip", curRecord);

            console.log("\n\n\ntimestamp to receive getChainTip ret : ", edTs, edTs - bgTs);
        }).catch((err) => {
            console.error(err);
        });
} else if ("queryEraSummaries" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('queryEraSummaries Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getEpochsParameters" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getEpochsParameters Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getBalancedConfig" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
            let assetAmountThreshelds = res.data.assetAmountThresheld;
            console.log('\n\n asset[ADA] AmountThresheld: ', assetAmountThreshelds['lovelace']);
            console.log('\n\n asset[4745524f] AmountThresheld: ', assetAmountThreshelds['10a49b996e2402269af553a8a96fb8eb90d79e9eca79e2b4223057b64745524f']);
            console.log('\n\n asset[434f434b] AmountThresheld: ', assetAmountThreshelds['1ad4f068a49bbf0d4f05335cadeca0519cef34cc1b2bc35b2e5739ae434f434b']);
            console.log('\n\n asset[0014df104e494e4a415a] AmountThresheld: ', assetAmountThreshelds['df1d850c46d6c9d12cbf6181c35db9225a91b77c8a646b7f636f8ae40014df104e494e4a415a']);
            console.log('\n\n asset[4c6f756579] AmountThresheld: ', assetAmountThreshelds['ac11a1a07f04ec9efee4c46c359725922377ec5a4596bbed670cc9204c6f756579']);
            console.log('\n\n asset[54414441] AmountThresheld: ', assetAmountThreshelds['9eaed3f99f5c9da1695acaf2542cd6b9f3ef18bbf94dd3f77d17f9cb54414441']);
            console.log('\n\n asset[4341524453] AmountThresheld: ', assetAmountThreshelds["1fc21c9c7df3deca16d699b2d54cf5aa477576adc45f7c1340138a194341524453"]);
        }).catch((err) => {
            console.error(err);
        });
} else if ("queryGenesisConfig" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("checkUtxoAvailable" === cmdRoute) {
    const data = {
        "txId":"e469dcec1cfc957f3ee56a92ca08a5d0ad6c630d2eafa750fddc623c700efc9e",
        "index":0,
        "slot":116314567
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getBlock" === cmdRoute) {
    const data = {
        blockNo: 9089046
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getUTXOs" === cmdRoute) {
    let qryParamAry = new Array();

    // // case 1: the query param is an Array which the element is address
    // qryParamAry.push("addr_test1qrnd57644dctpmh5z49u9kxdsr6t2px0jg0es4gjpy7kvzk2decd8n4d28t9helaqh6eq8tqpqxjn5km60dxreegmzuq6xqngy");

    // case 2: the query param is an Array which the element is tx index object includes txId & index
    let txInItem = {
        "txId": "5e5c1bcf5e92416c3f97b078ecaeb3151e768d738bc3ea28cfcccaf490e695ef",
        "index": 2
    };
    qryParamAry.push(txInItem);
    // txInItem = {
    //     "txId": "be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f2",
    //     "index": 1
    // };
    // qryParamAry.push(txInItem);
    console.log("query utxo: ",qryParamAry);

    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, qryParamAry)
        .then((res) => {
            let edTs = Date.now();
            console.log('Body: ', JSON.stringify(res.data));

            console.log("timestamp to receive utxo : ", edTs, edTs - bgTs);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getAddressUTXOs" === cmdRoute) {
    const data = {
        // address: "addr1qys3nr0s5wqz3gw2n9satl279ntzha2z92v4ewrknr234hzx8ugllqwa07adyqwz23j797tha446p0exqa8jjypyqzasq73gym"
        address: "addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd" //"addr_test1wqaxatpzr60u9vw7zjhxgu3p9n75ytwdzsgrkwunekenwng43h0kh",
        // address: "addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp" // testnet treasury
        // address: "addr_test1qr7rkhxz96s4jtcja55l3nhsxzceu6wmv3u4ttykhawy9xhu8dwvyt4ptyh39mfflr80qv93ne5akere2kkfd06ug2dq9y7rvt" // testnet leader
        // address:  "addr_test1xqwy8rmauavjqjqxu2x4ls98cksk6m6n9h37cqx4wjx8l3zwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2sg4c55x" // treasuryCheck
        // address: "addr_test1xph67xfscczu2xccnryv59favadg6wzhatqzltssmfvduj6wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2snm3zu0" // mintCheck
        // address:  "addr1x9y94ggrg0mrhnp2g0ckyhwggyynfz8ydpd6vp7vrpa6f9f9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsrlh4ng" // mainnet treasuryCheck
        // address: 'addr1qy6vf7reda8mmesz3h2s07mklaa0lflsagtaeheclnr4awp5cnu8jm60hhnq9rw4qlahdlm6l7nlp6shmn0n3lx8t6uqmj0szw' //mainnet leader
        // address: 'addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd', // mainnet treasury
    }; 
    console.log("getAddressUTXOs req:", data);

    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, data)
        .then((res) => {
            let edTs = Date.now();
            // console.log('Body: ',  JSON.stringify(res.data));

            let utxoNum = 0;
            // const keyAssetName = "9772ff715b691c0444f333ba1db93b055c0864bec48fff92d1f2a7fe.446a65645f746573744d6963726f555344"; //Djet
            // const keyAssetName = "526d246045bf4a66ae86fd7a9985a91ef3752113f9daa9060bb54be6.54436865636b436f696e"; // treasuryCheckToken
            // const keyAssetName = "2707ef39e2521117d2d3851ef80ad17737eb8294a58397948aa28568.4d436865636b436f696e"; // mintCheckToken
            const keyAssetName = "0691b2fecca1ac4f53cb6dfb00b7013e561d1f34403b957cbb5af1fa.4e49474854";
            // const keyAssetName = "lovelace";
            for(let i=0; i<res.data.length; i++){
                let utxoItem = res.data[i];

                // console.log("\n..utxoItem: ", i, JSON.stringify(utxoItem));
                for (let v = 0; v < utxoItem.amount.length; v++) {
                    let valueItem = utxoItem.amount[v];
                    // console.log("valueItem unit: ", valueItem.unit);
                    // // if ((1 === utxoItem.amount.length) && (keyAssetName === valueItem.unit) ){
                    if (keyAssetName === valueItem.unit) {
                    //     console.log("\n\nutxo index: ", utxoItem.tx_hash, utxoItem.tx_index);
                        
                    //     console.log("valueItem unit: ", valueItem.unit);
                    //     console.log("valueItem amount: ", valueItem.quantity);
                    //     console.log("valueItem data_hash: ", utxoItem.data_hash);
                    //     console.log("valueItem datumHash: ", utxoItem.datumHash);
                        console.log("asset-no: ", i, ++utxoNum);
                        // let tmpAmount = CardanoWasm.BigNum.from_str(valueItem.quantity);
                        // itemAssetValueA = itemAssetValueA.checked_add(tmpAmount);
                    }
                } 
            }
            
            // for(let i=0; i<res.data.length; i++){
            //     let utxoItem = res.data[i];
                
            //     if (("2f3b4c3799c6befa9f5da7ad00d27d7cf9e1a5f8312207dc4352aeec595f8a16" === utxoItem.tx_hash)
            //         || ("bdef9922147b1615ff17e3ef04753e4c5c72db77ba10e37bcad27f1aaa83910d" === utxoItem.tx_hash)
            //         || ("7c6df57bb005aaa600a19de8e9a22e4c9d3897301e10f2dd4af2dacc1b3af24c" === utxoItem.tx_hash)) {
            //         console.log("\nutxoItem txId: ", utxoItem.tx_hash);
            //     }
            //     console.log("utxoItem datahash: ", utxoItem.data_hash);
                    
            // }

            console.log("\n\n\ntimestamp to receive utxo : ", edTs, edTs - bgTs);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getAddressUTXOsWithBlockHeight" === cmdRoute) {
    const data = {
        address: 'addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd'// 'addr_test1xqqw340d77klvhfk4gnzhfrxkkrxahrzmvf27q5sf2mm002wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2svzq03w' //
    };

    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, data)
        .then((res) => {
            let edTs = Date.now();
            console.log('Body: ', res.data);

            let totalUtxoNum = 0;
            let mapAssetAmount = new Map();
            
            for(let i=0; i<res.data.length; i++){
                let utxoItem = res.data[i];
                let assetAmountAry = utxoItem.amount;

                if(1 < assetAmountAry.length){
                    for(let j=0; j<assetAmountAry.length; j++){
                        let amountItem = assetAmountAry[j];
                        if("lovelace" !== amountItem.unit){
                            console.log("\n...amountItem.unit: ", amountItem.unit);
                            let assetAmount = mapAssetAmount.get(amountItem.unit);
                            console.log("\n...amountItem.assetAmount: ", assetAmount);
                            if(undefined === assetAmount){
                                assetAmount = 0;
                            }
                            assetAmount++;
                            mapAssetAmount.set(amountItem.unit, assetAmount);

                            totalUtxoNum++;
                        }
                    }

                }else{
                    let assetAmount = mapAssetAmount.get("lovelace");
                    if(undefined === assetAmount){
                        assetAmount = 0;
                    }
                    assetAmount++;
                    mapAssetAmount.set("lovelace", assetAmount);

                    totalUtxoNum++;
                }
            }


            // console.log("\n\n\nmapAssetAmount: ", totalUtxoNum,  mapAssetAmount);
            // res.data.sort(compareUtxoAssetValue("lovelace"));
            console.log("\n\n\n sorted utxoArys: ", JSON.stringify(res.data));


            console.log("\n\n\n\ntimestamp to receive utxo : ", edTs, edTs - bgTs);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getBalanceByAddress" === cmdRoute) {
    const data = {
        address: 'addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp' // 'addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd'//'addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd'
    };

    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
            let edTs = Date.now();
            console.log("timestamp to request utxo : ", bgTs);

            console.log("\n\n\n\ntimestamp to receive utxo : ", edTs, edTs - bgTs);

        }).catch((err) => {
            console.error(err);
        });
} else if ("getAddressTx" === cmdRoute) {
    const data = {
        fromBlock: 4604132,
        toBlock: 4604152,
        address: "addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getTreasuryTx" === cmdRoute) { //getMsgTaskInfo
    const data = {
        fromBlock: 2719498,
        toBlock: 2719498,
        address: "addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getMsgTaskInfo" === cmdRoute) { //
    const data = {
        fromBlock: 4638520,
        toBlock: 4638530
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getMsgTaskInfo Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getCostModelParameters" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getCostModelParameters Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        }); //getTxById
} else if ("sendSignedTx" === cmdRoute) {
    const data = {
        rawTx: 'John Doe'
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("evaluateTx" === cmdRoute) {
    const data = {
        rawTx: "84ab0082825820d0dc8ff7f3797e2aaa4bd9e5dbf4a0bed2fbcd1932f03c044099b06c6cd596cb00825820d0dc8ff7f3797e2aaa4bd9e5dbf4a0bed2fbcd1932f03c044099b06c6cd596cb010182a300581d70170bf5636f54f864b2c690faf33d95c4caaec3dd7206e6f877d682f601821a002dc5d0a1581c76c4659b1b328354e6bded80f25b8ea17521584fc9919ef54a3fe86ca15247726f7570496e666f546f6b656e436f696e01028201d8185901b4d8799f9f581c170bf5636f54f864b2c690faf33d95c4caaec3dd7206e6f877d682f6581c56eed02841b7835d050d1801ccc61939ce8281026932576db36ef66a582102566b57122bc0d93e57d4fb8408e36ce73499dddaeab9d80cf89970a4b3aff353581cfc3b5cc22ea1592f12ed29f8cef030b19e69db647955ac96bf5c429a581c467090bbb832e8ce3f5bbc06c8fc1316b9442a9a0d74f2cc8e8edb8f581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c7ef5c3f9b5fedc95f8c10d4387a886a6de6610e32d1cf06f68a16a0a581c4e83a9652d76167d9289b190def35276bec262fb0cd18caa4a0835d5581c9c2abd15db9e9b27fca7f4b367cc08e28483d4ca05fcc63a3f58413c581ce9f9f6f5bfd064179d663d9258a75931ae00ee0042765ab341c25cf4581c6322159f474733196754316e299fb1327237ac3e8b110bb0147f8043581c98447834ec39b99bbe7b3875d07f7773282853cec6b6bc3eeb968d86581cc01204d5afbb3535fec9566f6512582100f39c938efe76727bf41112581cad297aa2f2441ca8445b5ed3fa4a858d4a9012f6bdb4969519b0e1744040404040ffff82583900b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19464578e1dcc55d0e9e8cf70c7afd5d2d48bf032123101941931e3e6b1b0000000104faaab4021a000a6b3b031a07f12f40081a07f12bbc0b5820a2cc866deeb10edc329371f9edb354ff5418fbf4a0d9df789057d90aae4d79430d81825820d0dc8ff7f3797e2aaa4bd9e5dbf4a0bed2fbcd1932f03c044099b06c6cd596cb010e81581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e191082583900b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19464578e1dcc55d0e9e8cf70c7afd5d2d48bf032123101941931e3e6b1b0000000104ed385b111a0014a49e128182582060399afc81c4eb7edf2eae0fdd687038621386dabcff52194f08bf808332cea400a20081825820d95d3f42204efe598586a210b1b56f447cee400af6bb6a0428fdc0263ce8d8165840d8e4e57685dece26c17594392ad1d06108ade0568b94cf2b0eaff949b70d54a3a2562be5543024e97dbdef6a7733c769bd7ea448380c78e15735b47ff6670803058184000002821a004c988e1a5479a224f5f6"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getTxById" === cmdRoute) {
    const data = {
        txId: "747f22df3e3edc28233b9767f2462f9a9ae72ce1102d394c55d377132f97474c"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));
        }).catch((err) => {
            console.error(err);
        });
} else if ("getTxUtxos" === cmdRoute) {
    const data = {
        txId: "270639fb98d4c93d1a0f34e72e4de5a0beb4470949a2581d2424634e6ffc5991"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));
        }).catch((err) => {
            console.error(err);
        });
} else if ("getTxsMetadata" === cmdRoute) {
    const data = {
        txId: "e1d2eb8df79a6f320c14d5a035620829ad8bf0b28ea31d039663d92bf36db46d"
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));
        }).catch((err) => {
            console.error(err);
        });
} else if ("getMintInfoByPolicyId" === cmdRoute) {
    const data = {
        policyId: "d2a8592ec9673ac18fea1044885f94518e954ab0cb2b6bb0a328d2af",
        beginBlockNo: 4464164,
        endBlockNo: 4464165
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));
        }).catch((err) => {
            console.error(err);
        });
} else if ("getAssetMintage" === cmdRoute) {
    const data = {
        tokenId: "25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935.55534454"
    };


    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));
            let edTs = Date.now();
            console.log("\n\n\n\ntimestamp to receive utxo : ", edTs, edTs - bgTs);

        }).catch((err) => {
            console.error(err);
        });
} else if ("getAssetMintInfo" === cmdRoute) {
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
} else if ("getEraSummariesByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getEraSummariesByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getBlockHeightByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getBlockHeightByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getCurProtocolParametersByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getCurProtocolParametersByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getGenesisConfigByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('queryGenesisConfig Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getChainTipByPlutusSdk" === cmdRoute) {
    const data = {
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getChainTipByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getDelegationsAndRewardsByPlutusSdk" === cmdRoute) {
    let data = new Array();
    let scriptsHash = "stake_test1urekpyl72p28h79wsqasu2k7v5c8gnckyawn6sdjghvucjcp86q35"; //"stake_test1uzyy407v2k5fcvvqcaq5ddd4wflgt77r7sg873ljnkg4r6qssl3wm";
    //"stake1u8g4qwntmh7apqe3pyfju4shthay6ae7r2thvmswpktez5s2y49dh";
    data.push(scriptsHash);

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('getDelegationsAndRewardsByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("evaluateTxByPlutusSdk" === cmdRoute) {
    const rawTx = "84aa0082825820b97fe4259c70a0bd9d28ed643107f59632e09913e323fb754719b54a8fca771900825820b97fe4259c70a0bd9d28ed643107f59632e09913e323fb754719b54a8fca7719010182a300581d70f3edaa4ecdb36e331be615eda7c87233e344db93eca1c192e0160ac701821a002d71a2a1581c76c4659b1b328354e6bded80f25b8ea17521584fc9919ef54a3fe86ca15247726f7570496e666f546f6b656e436f696e01028201d8185901afd8799f9f581cf3edaa4ecdb36e331be615eda7c87233e344db93eca1c192e0160ac7581c56eed02841b7835d050d1801ccc61939ce8281026932576db36ef66a582103a9ce704b36bb3f7912126abd563d0cadc04ad5fd3f21d138b9f37e485379be49581cfc3b5cc22ea1592f12ed29f8cef030b19e69db647955ac96bf5c429a581c1c438f7de759204806e28d5fc0a7c5a16d6f532de3ec00d5748c7fc4581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c6faf1930c605c51b1898c8ca153d675a8d3857eac02fae10da58de4b581c4e83a9652d76167d9289b190def35276bec262fb0cd18caa4a0835d5581c9c2abd15db9e9b27fca7f4b367cc08e28483d4ca05fcc63a3f58413c581ce9f9f6f5bfd064179d663d9258a75931ae00ee0042765ab341c25cf4581c6322159f474733196754316e299fb1327237ac3e8b110bb0147f8043581c98447834ec39b99bbe7b3875d07f7773282853cec6b6bc3eeb968d86581cc01204d5afbb3535fec9566f6512582100f39c938efe76727bf41112581cad297aa2f2441ca8445b5ed3fa4a858d4a9012f6bdb4969519b0e174ffff82583900b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19464578e1dcc55d0e9e8cf70c7afd5d2d48bf032123101941931e3e6b1b000000011a227147021a0009a558031a07a4e7900b5820a2cc866deeb10edc329371f9edb354ff5418fbf4a0d9df789057d90aae4d79430d81825820b97fe4259c70a0bd9d28ed643107f59632e09913e323fb754719b54a8fca7719010e81581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e191082583900b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19464578e1dcc55d0e9e8cf70c7afd5d2d48bf032123101941931e3e6b1b000000011a18fdc7111a001318d81281825820e8afb239dd4f9f0b732fc252e3639af06936aadd674231ba784736416c0b070d00a20081825820d95d3f42204efe598586a210b1b56f447cee400af6bb6a0428fdc0263ce8d8165840138d5eed74e34a4f5ed6cdcaac89d52e9a786d39ead0e00d7ec840117638b40fd278b16d9d39383123fceb5609e847578693400e61cd984521fc64246893ed01058184000002821a004c988e1a5479a224f5f6";

    axios.post(reqUrl, rawTx)
        .then((res) => {
            console.log('evaluateTx Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("submitTxByPlutusSdk" === cmdRoute) {
    const rawTx = "84ab008382582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820ae44d9011eb204eae2c310ffbbc01ff91173f069e56e9bd634d93326511e478c00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f201018182583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c741821a00fca773a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e1a3a699d00021a0004c371031a070413a6075820b421f6b15729c8e4d0040e338958dbc77460bdb1f47180d58a3cbd2c0682c14c09a1581c25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935a14357414e3a0098967f0b5820c4ee621e8b6886e3231be51f1d61a7c221bc9e8d3ddd5712075d0aceacd548fc0d8282582085c9d2997f8826716aecc6b080b3738b2370174e109a28d51c7cd30d0d2c22db00825820be3aa9d5af916bbc1f11685d15c207c9624dd93b7491f60babe51b2ffbdb49f2011082583901d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c7411a00e69468111a0009474a1281825820fffb1b66bd78837ea0136587c354ee6a0991b6d0a2954e48d46a476b3ce683df00a20081825820f86e30c08857030d1fcadfcb2e750c5f1f817deed4747be1a7a5fc9a5167678b5840ef5cffb0a068ceaedd98583ac3ad4166921dd5272cd85164af6a5300353e0b11b4562d9d81ac00510635f9d66acfb4c102c7493d505ba50efd215add537c6e0c0581840100d87980821a00171fe01a198a993cf5a101a56b66726f6d4163636f756e74827840616464723171383268387363357635776734656730656e6e656778767071727464786e68786c6467617973616b766d68357478347971736530336b7839796c7478277178337734736776726332336e373577756a347674676c6a30616166656361717370776a6c617765736d6749445820000000000000000000000000000000000000000000000041726965735f30333969746f4163636f756e74549d54fb4a5e5467cf3dbc904bcabd5efc38b763446b746f6b656e50616972494419020a647479706508";

    axios.post(reqUrl, rawTx)
        .then((res) => {
            console.log('submitTxByPlutusSdk Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getUTXOsByPlutusSdk" === cmdRoute) {
    let data = new Array();
    // let address = "addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp";
    // // 'addr_test1wqkyhmw5yaaa77tsxcatmgjgy74vsayn4h22nwzjzjlw4kc7zgwgx'//'addr1q8yt5fqv7hucv6p0yyjq2mh9lp9exr7kkdxmp872empmqp7ghgjqea0ese5z7gfyq4hwt7ztjv8adv6dkz0u4nkrkqrstcfp9l'
    // data.push(address);

    let txRef = {
        "txId": "b97fe4259c70a0bd9d28ed643107f59632e09913e323fb754719b54a8fca7719",
        "index": 0
    }    
    data.push(txRef);

    let bgTs = Date.now();
    console.log("timestamp to request utxo : ", bgTs);

    axios.post(reqUrl, data)
        .then((res) => {
            let edTs = Date.now();
            let retUtxos = res.data; 
            for(let i=0; i<retUtxos.length; i++){
                console.log('utxo: ', retUtxos[i]);

                let value = retUtxos[i][1].value;
                console.log("utxo value: ", value);
            }

            console.log("timestamp to receive utxo : ", edTs, edTs - bgTs);
        }).catch((err) => {
            console.error(err);
        });
}

function compareUtxoAssetValue(assetUnit) {

    return function(utxoItemA, utxoItemB){
 

        let itemAssetValueA = CardanoWasm.BigNum.from_str("0");
        for (let v = 0; v < utxoItemA.amount.length; v++) {
            let valueItem = utxoItemA.amount[v];
            if (assetUnit === valueItem.unit) {
                // console.log("valueItem A: ", valueItem);
                let tmpAmount = CardanoWasm.BigNum.from_str(valueItem.quantity);
                itemAssetValueA = itemAssetValueA.checked_add(tmpAmount);
            }
        }    

        let itemAssetValueB = CardanoWasm.BigNum.from_str("0");;
        for (let v = 0; v < utxoItemB.amount.length; v++) {
            let valueItem = utxoItemB.amount[v];
            if (assetUnit === valueItem.unit) {
                // console.log("valueItem B: ", valueItem);
                let tmpAmount = CardanoWasm.BigNum.from_str(valueItem.quantity);
                itemAssetValueB = itemAssetValueB.checked_add(tmpAmount);
            }
        }

        
        let ret = itemAssetValueB.compare(itemAssetValueA);
        return ret;
    }
}

function main() {

}

