const day1 = 24 * 60 * 60 * 1000;
const day30 = 30 * day1;
const day90 = 3 * day30;

const expiredDuration = {
    quota: 60 * 2000, //  2 min
    tokenPairs: 60 * 10000, // 10 min
    price: 120 * 10000, // 20 min
    requestLimit: 60000, // 1 min
    hackerlist: 24 * 3600000, // 24 h
    hackerlistFile: 1 * 3600000, // 1 h
    blacklist: 1 * 3600000, // 1 h
    redisRiskAccount: 1 * 3600000, // 1 h
    // redisRiskAccount: 10000, // 10 s TODO
    switchRPC: 5 * 60000, //  5 min
    // switchRPC: 5000, //  5000 ms
    ccPendingPoolTx: global.testnet ? 4 * 3600000 : 48 * 3600000, // testnet: 4H, mainnet: 48H
    // ccPendingPoolTx: 48*3600000, // 48 h

    getPosInfo: 1500, // 1.5 s
    getPastLogs: 3000, // 3 s
    getGasPrice: 1500, // 1.5 s
    getBlock: 2000, // 2 s
    getBalance: 2000, // 2 s
    getBlockNumber: 2000, // 2 s
    getNonce: 2000, // 2 s
    getBlockTransactionCount: 2000, // 2 s
    getScVar:  5000, // 5 s
    getTokenBalance: 2000, // 2 s
    getTokenSupply: 2000, // 2 s
    getTokenInfo: 2000, // 2 s
    getCoingeckoIdFromDB: 2000, // 2 s
    getMultiSmgInfoFromDB: 5000, // 5 s
    getTokenPairsFromDB: 1500, // 1.5 s
    getMultiTokenInfo: 2000, // 2 s
    getTokenInfoByStep: 2000, // 2 s
    getMultiTokenInfoByStep: 2000, // 2 s
    estimateGas: 2000, // 2 s
    getCode: 2000, // 2 s
    getChainSmgConfig: 2000, // 2 s
    getSrcProjectChainInfoByDestChain: 2000, // 2 s
    getMinCrossChainAmount: 2000, // 2 s
    getMultiAssetForAlgorand: 3000, // 3 s
    getAccountInfo: 1500, // 1 s
    multiCall: 5000, // 5 s
    estimateCrossChainNetworkFee: 3000, // 3 s
    estimateCrossChainOperationFee: 3000, // 3 s
    getTxInfo: 3000, // 3 s
    getUTXO: 3000, // 3 s
    getCoingeckoList: 2000, // 2 s
    getCoingeckoPrice: 3000, // 3 s
    callScFunc: 3000, // 3 s

    saveTxIn: 60000, // 60 s
    saveTxOut: 60000, // 60 s

    redisTTL: 2 * 3600000, // 2 h

    timeout1Second: 1000, // 1 s
    timeout2Second: 2000, // 2 s
    timeout3Second: 3000, // 3 s
    timeout4Second: 4000, // 4 s
    timeout5Second: 5000, // 5 s
    timeout200Ms: 200, // 0.2 s
    timeout100Ms: 100, // 0.1 s
    timeout1Ms: 1, // 1 ms
    timeout10Ms: 10, // 10 ms
    timeout100Ms: 100, // 100 ms
    timeout200Ms: 200, // 200 ms

    timeout1500Ms: 1500, // 1.5 s
    timeout1Min: 60000, // 1 min
    timeout10Min: 600000, // 10 min
    timeout30Min: 3 * 600000, // 30 min
    day1: day1,
    day30: day30,
    day90: day90,
};

const chainTokenTypeDict = {
    Erc20: "Erc20"
    , Erc721: "Erc721"
    , Erc1155: "Erc1155"
}
const chainTokenTypeIndexDict = {
    Erc20: 0
    , Erc721: 1
    , Erc1155: 2
}

// const tokenTypes = ["Erc20", "Erc721", "Erc1155"];
const {crossTokenTypeDict: crossTokenTypes, tokenTypeDict, isErc20TokenType} = Object.keys(chainTokenTypeDict).reduce((reduced, tokenType) => {
  const tokenTypeLowerCase = tokenType.toLowerCase();
  reduced.crossTokenTypeDict[tokenType] = tokenType;
  reduced.crossTokenTypeDict[tokenTypeLowerCase] = tokenType;
  reduced.tokenTypeDict[tokenType] = chainTokenTypeIndexDict[tokenType];
  reduced.tokenTypeDict[tokenTypeLowerCase] = chainTokenTypeIndexDict[tokenType];
  reduced.tokenTypeDict[chainTokenTypeIndexDict[tokenType]] = tokenType;
  if (tokenType == chainTokenTypeDict.Erc20) {
    reduced.isErc20TokenType[tokenType] = true;
    reduced.isErc20TokenType[tokenTypeLowerCase] = true;
    reduced.isErc20TokenType[chainTokenTypeIndexDict[tokenType]] = true;
  }
  return reduced;
}, {crossTokenTypeDict:{}, tokenTypeDict:{}, isErc20TokenType:{}});
// const crossTokenTypes = {
//   Erc20: "Erc20",
//   Erc721: "Erc721",
//   Erc1155: "Erc1155",
// }

const apiKeyTokenPairsWhiteInfo = {
    "4ffef9104ced391e4d447e9a8d8ce40f7a137698b24c566db21d2528aac6d0d9": { // desktop wallet apikey
        "BTC": [
            {
                "tokenPairID": "5" // BTC @Wanchain<>Ethereum
                , "chainQuotaHidden": []
                , "tokenPairType": chainTokenTypeIndexDict.Erc20
                , "tags": ["desktop"]
            }
            , {
                "tokenPairID": "419" // BTC @Wanchain<>Ethereum
                , "chainQuotaHidden": []
                , "tokenPairType": chainTokenTypeIndexDict.Erc20
                , "tags": ["ban"]
            }
            , {
                "tokenPairID": "14" // BTC @Bitcoin<>Ethereum
                , "chainQuotaHidden": []
                , "tokenPairType": chainTokenTypeIndexDict.Erc20
                , "tags": ["desktop"]
            }
            , {
                "tokenPairID": "416" // BTC @Bitcoin<>Ethereum
                , "chainQuotaHidden": []
                , "tokenPairType": chainTokenTypeIndexDict.Erc20
                , "tags": ["ban"]
            }
        ],
    },
};

const crossChainTokenPairQuotaHiddenInfo = {
    "4ffef9104ced391e4d447e9a8d8ce40f7a137698b24c566db21d2528aac6d0d9": { // desktop wallet apikey
        "BTC": [
            {
                // disable token pair 5 direction BTC @Wanchain -> Ethereum
                type: 'chaintokenpairquotahiddenflag',
                key: {
                    srcChainID: '2153201998',
                    targetChainID: '2147483708',
                    tokenPairID: '5'
                },
                value: true
            },
            {
                // enable token pair 5 direction BTC @Ethereum -> Wanchain
                type: 'chaintokenpairquotahiddenflag',
                key: {
                    srcChainID: '2147483708',
                    targetChainID: '2153201998',
                    tokenPairID: '5'
                },
                value: false
            },
            {
                // disable token pair 419 direction BTC @Wanchain -> Ethereum
                type: 'chaintokenpairquotahiddenflag',
                key: {
                    srcChainID: '2153201998',
                    targetChainID: '2147483708',
                    tokenPairID: '419'
                },
                value: true
            },
            {
                // disable token pair 419 direction BTC @Ethereum -> Wanchain
                type: 'chaintokenpairquotahiddenflag',
                key: {
                    srcChainID: '2147483708',
                    targetChainID: '2153201998',
                    tokenPairID: '419'
                },
                value: true
            },
            {
                // disable token pair 14 direction BTC @Bitcoin -> Ethereum
                type: 'chaintokenpairquotahiddenflag',
                key: {
                    srcChainID: '2147483648',
                    targetChainID: '2147483708',
                    tokenPairID: '14'
                },
                value: true
            },
            {
                // enable token pair 14 direction BTC @Ethereum -> Bitcoin
                type: 'chaintokenpairquotahiddenflag',
                key: {
                    srcChainID: '2147483708',
                    targetChainID: '2147483648',
                    tokenPairID: '14'
                },
                value: false
            },
            {
                // disable token pair 416 direction BTC @Bitcoin -> Ethereum
                type: 'chaintokenpairquotahiddenflag',
                key: {
                    srcChainID: '2147483648',
                    targetChainID: '2147483708',
                    tokenPairID: '416'
                },
                value: true
            },
            {
                // disable token pair 416 direction BTC @Ethereum -> Bitcoin
                type: 'chaintokenpairquotahiddenflag',
                key: {
                    srcChainID: '2147483708',
                    targetChainID: '2147483648',
                    tokenPairID: '416'
                },
                value: true
            }
        ]
    }
};

const banTokenPairs = ["1003", "1004", "1005", "1012", "1013", "1014"];
const isTokenPairForbidden = banTokenPairs.reduce((reduced, tokenPairID) => {
    reduced[tokenPairID] = true;
    return reduced;
}, {});

const unlimitedQuota = "100000000000000000000000000000000";
const TON_COIN_ACCOUT = "0x0000000000000000000000000000000000000000000000000000000000000000"; // 32 bytes
// const TON_BIP44_CHAINID = 0x8000025f; // 0x8000025f = 2147483703, TON BIP44 chain ID

const thirdPartBridgeDict = ["CCTPV1", "CCTPV2"].reduce((reduced, bridge) => {
    if (bridge) {
        const bridgeLowerCase = bridge.toLowerCase();
        reduced[bridge] = bridge;
        reduced[bridgeLowerCase] = bridge;
    }
    return reduced;
}, {});

const cctpApiEndpoint = {
    testnet: `https://iris-api-sandbox.circle.com`,
    mainnet: `https://iris-api.circle.com`,
}

const cctpTransferMode = {
    fastTransfer: 1000,
    standardTransfer: 2000,
}

const CCTP_FEE_DENOMINATOR = 10000;
const DENOMINATOR = 10000;

const coingechoEndpoint = {
    price: "https://api.coingecko.com/api/v3/simple/price",
    list: "https://api.coingecko.com/api/v3/coins/list"
};

const cctpTpIDlowerBoundMinusOne = 109019445540330425730058555239064252280644797395591049212970481727945779477530n;
const CCTP_TOKEN_PAIR_ID_MIN = 109019445540330425730058555239064252280644797395591049212970481727945779477531n;


exports.expiredDuration = expiredDuration;
exports.chainTokenTypeDict = chainTokenTypeDict;
exports.chainTokenTypeIndexDict = chainTokenTypeIndexDict;
exports.crossTokenTypes = crossTokenTypes;
exports.tokenTypeDict = tokenTypeDict;
exports.isErc20TokenType = isErc20TokenType;
exports.apiKeyTokenPairsWhiteInfo = apiKeyTokenPairsWhiteInfo;
exports.crossChainTokenPairQuotaHiddenInfo = crossChainTokenPairQuotaHiddenInfo;
exports.banTokenPairs = banTokenPairs;
exports.isTokenPairForbidden = isTokenPairForbidden;
exports.unlimitedQuota = unlimitedQuota;
exports.TON_COIN_ACCOUT = TON_COIN_ACCOUT;
// exports.TON_BIP44_CHAINID = TON_BIP44_CHAINID;
exports.thirdPartBridgeDict = thirdPartBridgeDict;
exports.cctpApiEndpoint = cctpApiEndpoint;
exports.cctpTransferMode = cctpTransferMode;
exports.CCTP_FEE_DENOMINATOR = CCTP_FEE_DENOMINATOR;
exports.DENOMINATOR = DENOMINATOR;
exports.coingechoEndpoint = coingechoEndpoint;
exports.cctpTpIDlowerBoundMinusOne = cctpTpIDlowerBoundMinusOne;
exports.CCTP_TOKEN_PAIR_ID_MIN = CCTP_TOKEN_PAIR_ID_MIN;
