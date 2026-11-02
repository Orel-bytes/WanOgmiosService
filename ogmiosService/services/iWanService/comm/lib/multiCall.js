const customMultiCall = require("@gao623/multicall-js");
const libCommon = require("./common");

const DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST = 200;

function getMultiCallTypeDict() {
    return customMultiCall.MultiCall.multiCallTypeDict;
}

function getMultiCallAggregateDict() {
    return customMultiCall.MultiCall.makerDaoInfo.funcNameDict;
}

async function chainTryMultiCall(client, calls, multiCallAddress, options) {
    const functionTag = "chainTryMultiCall ===>";
    options = Object.assign({}, {
        maxQueryCountPerRequest: DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST,
        aggregateFuncName: getMultiCallAggregateDict().tryAggregate,
        multiCallType: getMultiCallTypeDict().ethMultiCall,
        log: console
    }, options);
    const {
        maxQueryCountPerRequest,
        aggregateFuncName,
        multiCallType,
        log,
    } = options;
    var multiStepCalls = calls.reduce((reduced, next, index) => {
        let pos = reduced.length - 1;
        if (0 === index % maxQueryCountPerRequest) {
            reduced.push([]);
            pos = reduced.length - 1;
        }
        reduced[pos].push(next);
        return reduced;
    }, []);

    const result = libCommon.deepArrayFlatten(await Promise.all(multiStepCalls.map(async (calls) => {
        let ret;
        try {
            ret = await customMultiCall.MultiCall.aggregate(client, multiCallAddress, JSON.parse(JSON.stringify(calls)), {
                multiCallType, aggregateFuncName, log
            });
        } catch (err) {
            log.error(functionTag, "calls:", JSON.stringify(calls), "multiCallType:", multiCallType, "aggregateFuncName:", aggregateFuncName, "err:", err);
        }
        return ret;
    })));

    return result;
}

async function chainMultiCall(client, calls, multiCallAddress, options) {
    options = Object.assign({}, {
        maxQueryCountPerRequest: DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST,
        aggregateFuncName: getMultiCallAggregateDict().tryAggregate,
        multiCallType: getMultiCallTypeDict().ethMultiCall,
        log: console
    }, options);
    const {
        maxQueryCountPerRequest,
        aggregateFuncName,
        multiCallType,
        log,
    } = options;
    var multiStepCalls = calls.reduce((reduced, next, index) => {
        let pos = reduced.length - 1;
        if (0 === index % maxQueryCountPerRequest) {
            reduced.push([]);
            pos = reduced.length - 1;
        }
        reduced[pos].push(next);
        return reduced;
    }, []);

    // console.log("\n\n..chainMultiCall(client client:", client);
    // console.log("chainMultiCall ===> multiStepCalls:", JSON.stringify(multiStepCalls), "multiCallType:", multiCallType, "aggregateFuncName:", aggregateFuncName);
    const result = libCommon.deepArrayFlatten(await Promise.all(multiStepCalls.map(async (calls) => {
        return await customMultiCall.MultiCall.aggregate(client, multiCallAddress, JSON.parse(JSON.stringify(calls)), {
            multiCallType, aggregateFuncName, log
        });
    })));

    return result;
}

async function getEvmChainTokenPairTypeInfo(log, client, multiCallAddress, tokenManagerAddress, tokenPairIDs, options) {
    const funcTag = "getEvmChainTokenPairTypeInfo ===>";
    options = Object.assign({}, {
        maxQueryCountPerRequest: DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST,
        multiCallType: getMultiCallTypeDict().ethMultiCall,
    }, options);
    const { maxQueryCountPerRequest, multiCallType } = options;
    const delimiter = "|"
    const multiCalls = tokenPairIDs.map((tokenPairID) => {
        return {
            address: tokenManagerAddress
            , funcName: "mapTokenPairType"
            , inputTypes: ["uint256"]
            , outputTypes: ["uint256"]
            , outputNames: [`${tokenPairID}${delimiter}tokenPairType`]
            , args: [tokenPairID]
        };
    });

    const multiCallOptions = { maxQueryCountPerRequest, multiCallType, log };

    // TODO: debug
    let chainMultiCallsResult;
    try {
        chainMultiCallsResult = await chainMultiCall(client, multiCalls, multiCallAddress, multiCallOptions);
    } catch (err) {
        log.warn(funcTag, "error@chainMultiCall => multiCalls:", JSON.stringify(multiCalls), "multiCallAddress:", JSON.stringify(multiCallAddress), "multiCallOptions:", JSON.stringify(multiCallOptions), "error:", err);
        throw err;
    }
    // const chainMultiCallsResult = await chainMultiCall(client, multiCalls, multiCallAddress, multiCallOptions);

    let chainTokenPairTypeDict = {};
    for (const multiTokenPairType of chainMultiCallsResult) {
        for (const info of multiTokenPairType.result) {
            for (const resName in info) {
                const [tokenPairID, property] = resName.split(delimiter);
                chainTokenPairTypeDict[tokenPairID] || (chainTokenPairTypeDict[tokenPairID] = {})
                chainTokenPairTypeDict[tokenPairID][property] = info[resName];
            }
        }
    }

    return chainTokenPairTypeDict;
}

function getDecimalsCalls(tokenAccount, delimiter, options) {
    return {
        address: tokenAccount
        , funcName: "decimals"
        , inputTypes: (options && options.decimals)
            ? options.decimals.inputTypes
            : []
        , outputTypes: (options && options.decimals)
            ? options.decimals.outputTypes
            : ["uint256"]
        , outputNames: [`${tokenAccount}${delimiter}decimals`]
        , args: []
    };
}

function getERC20Calls(tokenAccount, delimiter, options) {
    return [
        {
            address: tokenAccount
            , funcName: ["name", "NAME", "Name"]
            , inputTypes: (options && options.name)
                ? options.name.inputTypes
                : []
            , outputTypes: (options && options.name)
                ? options.name.outputTypes
                // : ["string"]
                : [["string", "bytes32", "bytes"]]
            , outputNames: [`${tokenAccount}${delimiter}name`]
            , args: []
        }, {
            address: tokenAccount
            , funcName: ["symbol", "SYMBOL", "Symbol"]
            , inputTypes: (options && options.symbol)
                ? options.symbol.inputTypes
                : []
            , outputTypes: (options && options.symbol)
                ? options.symbol.outputTypes
                // : ["string"]
                : [["string", "bytes32", "bytes"]]
            , outputNames: [`${tokenAccount}${delimiter}symbol`]
            , args: []
        }, {
            address: tokenAccount
            , funcName: ["decimals", "DECIMALS", "Decimals"]
            , inputTypes: (options && options.decimals)
                ? options.decimals.inputTypes
                : []
            , outputTypes: (options && options.decimals)
                ? options.decimals.outputTypes
                // : ["uint256"]
                : ["uint8"]
            , outputNames: [`${tokenAccount}${delimiter}decimals`]
            , args: []
        }
    ];
}

function getERC721Calls(tokenAccount, delimiter, options) {
    return [
        {
            address: tokenAccount
            , funcName: "name"
            , inputTypes: (options && options.name)
                ? options.name.inputTypes
                : []
            , outputTypes: (options && options.name)
                ? options.name.outputTypes
                // : ["string"]
                : [["string", "bytes32", "bytes"]]
            , outputNames: [`${tokenAccount}${delimiter}name`]
            , args: []
        }, {
            address: tokenAccount
            , funcName: "symbol"
            , inputTypes: (options && options.symbol)
                ? options.symbol.inputTypes
                : []
            , outputTypes: (options && options.symbol)
                ? options.symbol.outputTypes
                // : ["string"]
                : [["string", "bytes32", "bytes"]]
            , outputNames: [`${tokenAccount}${delimiter}symbol`]
            , args: []
        }
    ];
}

function getERC1155Calls(tokenAccount, delimiter, options) {
    return [];
}

async function getEvmChainTokenInfoByCalls(log, client, multiCallAddress, multiCalls, delimiter, options) {
    const funcTag = "getEvmChainTokenInfoByCalls ===>";
    options = Object.assign({}, {
        maxQueryCountPerRequest: DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST,
        multiCallType: getMultiCallTypeDict().ethMultiCall,
    }, options);
    const { maxQueryCountPerRequest, multiCallType } = options;

    const multiCallOptions = { maxQueryCountPerRequest, multiCallType, log };

    // TODO: debug
    let chainMultiCallsResult;
    try {
        chainMultiCallsResult = await chainMultiCall(client, multiCalls, multiCallAddress, multiCallOptions);
    } catch (err) {
        log.warn(funcTag, "error@chainMultiCall => multiCalls:", JSON.stringify(multiCalls), "multiCallAddress:", JSON.stringify(multiCallAddress), "multiCallOptions:", JSON.stringify(multiCallOptions), "error:", err);
        throw err;
    }
    // const chainMultiCallsResult = await chainMultiCall(client, multiCalls, multiCallAddress, multiCallOptions);

    let chainTokenInfo = {};
    for (const multiTokenInfo of chainMultiCallsResult) {
        for (const info of multiTokenInfo.result) {
            for (const resName in info) {
                const [tokenAccount, property] = resName.split(delimiter);
                chainTokenInfo[tokenAccount] || (chainTokenInfo[tokenAccount] = {})
                chainTokenInfo[tokenAccount][property] = info[resName];
            }
        }
    }

    return chainTokenInfo;
}

async function getEvmChainTokenInfoByStatusCalls(log, client, multiCallAddress, multiCalls, delimiter, options) {
    const funcTag = "getEvmChainTokenInfoByStatusCalls ===>";
    options = Object.assign({}, {
        maxQueryCountPerRequest: DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST,
        multiCallType: getMultiCallTypeDict().ethMultiCall,
    }, options);
    const { maxQueryCountPerRequest, multiCallType } = options;

    const multiCallOptions = {
        maxQueryCountPerRequest,
        aggregateFuncName: getMultiCallAggregateDict().tryAggregate,
        multiCallType,
        log,
    };

    // TODO: debug
    let chainMultiCallsResult;
    try {
        chainMultiCallsResult = await chainMultiCall(client, multiCalls, multiCallAddress, multiCallOptions);
    } catch (err) {
        log.warn(funcTag, "error@chainMultiCall => multiCalls:", JSON.stringify(multiCalls), "multiCallAddress:", JSON.stringify(multiCallAddress), "multiCallOptions:", JSON.stringify(multiCallOptions), "error:", err);
        throw err;
    }
    // const chainMultiCallsResult = await chainMultiCall(client, multiCalls, multiCallAddress, multiCallOptions);
    // console.log(funcTag, "chainMultiCallsResult:", JSON.stringify(chainMultiCallsResult));

    let chainTokenInfo = {};
    for (const multiTokenInfo of chainMultiCallsResult) {
        const resultStatus = multiTokenInfo.status;
        for (let i = 0; i < multiTokenInfo.result.length; ++i) {
            const info = multiTokenInfo.result[i];
            if (resultStatus && resultStatus[i]) {
                for (const resName in info) {
                    const [tokenAccount, property] = resName.split(delimiter);
                    chainTokenInfo[tokenAccount] || (chainTokenInfo[tokenAccount] = {})
                    chainTokenInfo[tokenAccount][property] = info[resName];
                }
            }
        }
    }

    return chainTokenInfo;
}

async function getEvmChainERC20TokenInfo(log, client, multiCallAddress, tokenAccounts, options) {
    const funcTag = "getEvmChainERC20TokenInfo ===>";
    options = Object.assign({}, {
        maxQueryCountPerRequest: DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST,
        multiCallType: getMultiCallTypeDict().ethMultiCall,
    }, options);
    const { tokenAbiDict, maxQueryCountPerRequest, multiCallType } = options;

    const delimiter = "|"
    const multiCalls = libCommon.deepArrayFlatten(tokenAccounts.map((tokenAccount) => {
        return [{
            address: tokenAccount
            , funcName: ["name", "NAME", "Name"]
            // ,inputTypes:[]
            // ,outputTypes:["string"]
            , inputTypes: (tokenAbiDict && tokenAbiDict[tokenAccount])
                ? tokenAbiDict[tokenAccount].name.inputTypes
                : []
            , outputTypes: (tokenAbiDict && tokenAbiDict[tokenAccount])
                ? tokenAbiDict[tokenAccount].name.outputTypes
                : [["string", "bytes32", "bytes"]]
            , outputNames: [`${tokenAccount}${delimiter}name`]
            , args: []
        }, {
            address: tokenAccount
            , funcName: ["symbol", "SYMBOL", "Symbol"]
            // ,inputTypes:[]
            // ,outputTypes:["string"]
            , inputTypes: (tokenAbiDict && tokenAbiDict[tokenAccount])
                ? tokenAbiDict[tokenAccount].symbol.inputTypes
                : []
            , outputTypes: (tokenAbiDict && tokenAbiDict[tokenAccount])
                ? tokenAbiDict[tokenAccount].symbol.outputTypes
                : [["string", "bytes32", "bytes"]]
            , outputNames: [`${tokenAccount}${delimiter}symbol`]
            , args: []
        }, {
            address: tokenAccount
            , funcName: ["decimals", "DECIMALS", "Decimals"]
            // ,inputTypes:[]
            // ,outputTypes:["uint256"]
            , inputTypes: (tokenAbiDict && tokenAbiDict[tokenAccount])
                ? tokenAbiDict[tokenAccount].decimals.inputTypes
                : []
            , outputTypes: (tokenAbiDict && tokenAbiDict[tokenAccount])
                ? tokenAbiDict[tokenAccount].decimals.outputTypes
                : ["uint256"]
            , outputNames: [`${tokenAccount}${delimiter}decimals`]
            , args: []
        }]
            ;
    }));

    const multiCallOptions = { maxQueryCountPerRequest, multiCallType, log };

    // TODO: debug
    let chainMultiCallsResult;
    try {
        chainMultiCallsResult = await chainMultiCall(client, multiCalls, multiCallAddress, multiCallOptions);
    } catch (err) {
        log.error(funcTag, "error@chainMultiCall => multiCalls:", JSON.stringify(multiCalls), "multiCallAddress:", JSON.stringify(multiCallAddress), "multiCallOptions:", JSON.stringify(multiCallOptions), "error:", err);
        throw err;
    }
    // const chainMultiCallsResult = await chainMultiCall(client, multiCalls, multiCallAddress, multiCallOptions);

    let chainTokenInfo = {};
    for (const multiAssetDebt of chainMultiCallsResult) {
        for (const info of multiAssetDebt.result) {
            for (const resName in info) {
                const [tokenAccount, property] = resName.split(delimiter);
                chainTokenInfo[tokenAccount] || (chainTokenInfo[tokenAccount] = {})
                chainTokenInfo[tokenAccount][property] = info[resName];
            }
        }
    }

    return chainTokenInfo;
}

function parseMultiCallOutputStruct(item) {
    let parsedInfo = {};
    let keys = Object.keys(item);
    for (let index = 0; index < keys.length; ++index) {
        const key = keys[index];
        if (key === index.toString()) {
            continue;
        }
        parsedInfo[key] = item[key];
    }
    return parsedInfo;
}

async function getEvmMinTokenPairCrossChainAmount(web3, crossScAddr, multicallAddr, tokenPairIDs) {
    const functionTag = "getEvmMinTokenPairCrossChainAmount ===>";

    // {"inputs":[{"internalType":"uint256","name":"tokenPairID","type":"uint256"}],"name":"getMinTokenPairCrossChainAmount","outputs":[{"internalType":"uint256","name":"minAmount","type":"uint256"}],"stateMutability":"view","type":"function"}
    const targetInfo = tokenPairIDs.map(tokenPairID => ({
        address: crossScAddr,
        funcName: "getMinTokenPairCrossChainAmount",
        inputTypes: [{ "name": "tokenPairID", "type": "uint256" }],
        outputTypes: [{ "name": "minAmount", "type": "uint256" }],
        outputNames: [`${tokenPairID}`],
        args: [tokenPairID]
    }));
    // console.log(functionTag, "targetInfo", JSON.stringify(targetInfo))

    const multiCallTypeDict = getMultiCallTypeDict();
    const multiCallAggregateDict = getMultiCallAggregateDict();
    const multiCallOptions = { multiCallType: multiCallTypeDict.ethMultiCall, aggregateFuncName: multiCallAggregateDict.aggregate };
    const chainMultiCallsResult = await chainMultiCall(web3, targetInfo, multicallAddr, multiCallOptions);
    // console.log(functionTag, "chainMultiCallsResult:", JSON.stringify(chainMultiCallsResult));
    // [{"blockNumber":"81635574","result":[{"1240":"1000000000000000000"},{"1241":"0"},{"1242":"0"}]}]

    let minAmountDict = {};
    for (let i = 0; i < chainMultiCallsResult.length; ++i) {
        const callResult = chainMultiCallsResult[i].result;
        for (let j = 0; j < callResult.length; ++j) {
            for (const tokenPairID in callResult[j]) {
                const minAmount = callResult[j][tokenPairID];
                minAmountDict[tokenPairID] = minAmount;
            }
        }
    }
    // {"1240":"1000000000000000000","1241":"0","1242":"0"}
    // console.log(functionTag, "minAmountDict:", JSON.stringify(minAmountDict));
    return minAmountDict;
}

async function getEvmTotalMinTokenPairCrossChainAmount(web3, crossScAddr, multicallAddr) {
    const functionTag = "getEvmTotalMinTokenPairCrossChainAmount ===>";

    const targetInfo = [{
        address:crossScAddr
        ,funcName:"getMinTokenPairCrossChainAmountLength"
        ,inputTypes:[]
        ,outputTypes:[{"internalType":"uint256","name":"length","type":"uint256"}]
        ,outputNames:["length"]
        ,args:[]
    }]
    const multiCallTypeDict = getMultiCallTypeDict();
    const multiCallAggregateDict = getMultiCallAggregateDict();
    const multiCallOptions = { multiCallType: multiCallTypeDict.ethMultiCall, aggregateFuncName: multiCallAggregateDict.aggregate };
    const chainMultiCallsResult = await chainMultiCall(web3, targetInfo, multicallAddr, multiCallOptions);
    const totalLength = parseInt(chainMultiCallsResult?.[0]?.result?.[0]?.length || 0);
    // console.log(functionTag, "totalLength:", totalLength);
    // console.log(functionTag, "chainMultiCallsResult:", JSON.stringify(chainMultiCallsResult));

    let minAmountDict = {};
    if (totalLength > 0) {
        let targetInfo = new Array(totalLength);
        for (let i = 0; i < totalLength; ++i) {
            targetInfo[i] = {
                address:crossScAddr
                ,funcName:"getMinTokenPairCrossChainAmountByIndex"
                ,inputTypes:[{"internalType":"uint256","name":"index","type":"uint256"}]
                ,outputTypes:[{"internalType":"uint256","name":"tokenPairID","type":"uint256"},{"internalType":"uint256","name":"minAmount","type":"uint256"}]
                ,outputNames:[`tokenPairID`, `minAmount`]
                ,args:[i]
            };
        }

        const chainMultiCallsResult = await chainMultiCall(web3, targetInfo, multicallAddr, multiCallOptions);
        // [{"blockNumber":"81677497","result":[{"tokenPairID":"1240","minAmount":"1000000000000000000"}]}]
        // console.log(functionTag, "chainMultiCallsResult:", JSON.stringify(chainMultiCallsResult));

        for (let i = 0; i < chainMultiCallsResult.length; ++i) {
            const chainMultiRequestResult = chainMultiCallsResult[i];
            if (!chainMultiRequestResult || !chainMultiRequestResult.result) {
                continue;
            }
            // console.log(functionTag, "chainMultiRequestResult:", JSON.stringify(chainMultiRequestResult));
            const chainMultiRequestResultItem = chainMultiRequestResult.result;
            for (let j = 0; j < chainMultiRequestResultItem.length; ++j) {
                if (!chainMultiRequestResultItem[j]) {
                    continue;
                }
                const { tokenPairID, minAmount } = chainMultiRequestResultItem[j];
                minAmountDict[tokenPairID] = minAmount;
            }
        }
    }
    // { '1240': '1000000000000000000' }
    // console.log("minAmountDict:", minAmountDict)
    return minAmountDict;
}


exports.DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST = DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST;
exports.getMultiCallTypeDict = getMultiCallTypeDict;
exports.getMultiCallAggregateDict = getMultiCallAggregateDict;
exports.chainMultiCall = chainMultiCall;
exports.chainTryMultiCall = chainTryMultiCall;
exports.parseMultiCallOutputStruct = parseMultiCallOutputStruct;
exports.getEvmChainTokenPairTypeInfo = getEvmChainTokenPairTypeInfo;
exports.getEvmChainTokenInfoByCalls = getEvmChainTokenInfoByCalls;
exports.getEvmChainTokenInfoByStatusCalls = getEvmChainTokenInfoByStatusCalls;
exports.getEvmChainERC20TokenInfo = getEvmChainERC20TokenInfo;
exports.getDecimalsCalls = getDecimalsCalls;
exports.getERC20Calls = getERC20Calls;
exports.getERC721Calls = getERC721Calls;
exports.getERC1155Calls = getERC1155Calls;
exports.getEvmMinTokenPairCrossChainAmount = getEvmMinTokenPairCrossChainAmount;
exports.getEvmTotalMinTokenPairCrossChainAmount = getEvmTotalMinTokenPairCrossChainAmount;