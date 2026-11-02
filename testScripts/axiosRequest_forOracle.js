const axios = require('axios');

let testPath = "getAssetMintage";
let apiServer = "http://44.229.225.45:4337";
let reqUrl = `${apiServer}/${testPath}`

if ("getBalanceByAddress" === testPath) {
    const data = {
        address: 'addr_test1wp4v5rfz32tzkdthxhn4zvy5m4qexa8ghxlasv606y400ucjsz3lc'
    };

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', res.data);
        }).catch((err) => {
            console.error(err);
        });
} else if ("getAssetMintage" === testPath) {
    const data = {       
         tokenId: "0052bf6cd66b13b469813422373d8362918aef39a2607af9fa878719.57415350"
    };   

    axios.post(reqUrl, data)
        .then((res) => {
            console.log('Body: ', JSON.stringify(res.data));

        }).catch((err) => {
            console.error(err);
        });
}
