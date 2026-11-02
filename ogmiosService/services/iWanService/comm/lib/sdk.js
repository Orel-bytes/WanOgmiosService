const axios = require('axios');
const { default: BigNumber } = require('bignumber.js');
const web3EthAbi = require("web3-eth-abi");
const ecc = require('tiny-secp256k1');
const bitcoinLib = require("bitcoinjs-lib");
bitcoinLib.initEccLib(ecc);

const {
  getError,
} = require('comm/lib/error');
const {
    hexWith0x,
} = require("comm/lib/string")
const {
    expiredDuration,
    cctpApiEndpoint,
    cctpTransferMode,
    CCTP_FEE_DENOMINATOR,
} = require("comm/lib/constant")

function encodeTopic(type, param) {
    return hexWith0x(web3EthAbi.encodeParameter(type, param));
}

function parseLogs(logs, abi) {
    if (logs === null || !Array.isArray(logs)) {
        return logs;
    }

    return logs.map(function (log) {
        let abiJson = abi.find(function (json) {
            return (json.type === 'event' && web3EthAbi.encodeEventSignature(json) === log.topics[0]);
        });

        if (abiJson) {
            try {
                //topics without the topic[0] if its a non-anonymous event, otherwise with topic[0].
                log.topics.splice(0, 1);
                let args = web3EthAbi.decodeLog(abiJson.inputs, log.data, log.topics);
                for (var index = 0; index < abiJson.inputs.length; index++) {
                    if (args.hasOwnProperty(index)) {
                        delete args[index];
                    }
                }
                log.event = log.event || abiJson.name;
                log.eventName = abiJson.name;
                log.args = args;
                return log;
            } catch (err) {
                return log;
            }
        } else {
            return log;
        }
    });
}

function calcFuncSignature(funcName, abi) {
    let jsons = abi.filter(function (json) {
        return (json.type === 'function' && json.name === funcName);
    });
    if (jsons.length !== 1) {
        return null;
    } else {
        return web3EthAbi.encodeFunctionSignature(jsons[0]);
    }
}

function calcEventSignature(chainType, eventName, abi) {
    let jsons = abi.filter(function (json) {
        return (json.type === 'event' && json.name === eventName);
    });
    if (!jsons.length) {
        return null;
    }
    return web3EthAbi.encodeEventSignature(jsons[0]);
}

function parseEventAbi(abi, eventName) {
    let jsons = abi.filter(function (json) {
        return eventName
            ? (json.type === 'event' && Array.isArray(eventName) ? eventName.includes(json.name) : json.name === eventName)
            : (json.type === 'event')
            ;
        // return (json.type === 'event' && json.name === eventName);
    });
    if (!jsons.length) {
        return null;
    } else {
        return jsons.map(json => ({
            signature: web3EthAbi.encodeEventSignature(json),
            name: json.name,
            inputs: json.inputs,
        }))
    }
}

function parseFuncAbi(abi, funcName) {
    let jsons = abi.filter(function (json) {
        return funcName
            ? (json.type === 'function' && Array.isArray(funcName) ? funcName.includes(json.name) : json.name === funcName)
            : (json.type === 'function')
            ;
        // return (json.type === 'function' && json.name === funcName);
    });
    if (!jsons.length) {
        return null;
    } else {
        return jsons.map(json => ({
            signature: web3EthAbi.encodeFunctionSignature(json),
            name: json.name,
            inputs: json.inputs,
        }))
    }
}

function decodeLogs(logs, abi) {
    if (logs === null || !Array.isArray(logs)) {
        return logs;
    }

    const eventAbiParsed = parseEventAbi(abi);
    const eventAbiParsedDict = eventAbiParsed.reduce((reduced, parsedAbi) => {
        reduced[parsedAbi.signature] = parsedAbi;
        return reduced;
    }, {});
    return logs.map(function (log) {
        try {
            //topics without the topic[0] if its a non-anonymous event, otherwise with topic[0].
            const eventSignature = log.topics.splice(0, 1);
            if (!eventAbiParsedDict[eventSignature]) {
                return log;
            }
            const abiJson = eventAbiParsedDict[eventSignature];
            let args = web3EthAbi.decodeLog(abiJson.inputs, log.data, log.topics);
            for (var index = 0; index < abiJson.inputs.length; index++) {
                if (args.hasOwnProperty(index)) {
                    delete args[index];
                }
            }
            log.event = log.event || abiJson.name;
            log.eventName = abiJson.name;
            log.args = args;
            return log;
        } catch (err) {
            return log;
        }
    });
}

function updateLatestPastLogDict(latestPastLogDict, log, uniqueKey) {
    if (
        !log.removed && (
            !latestPastLogDict.hasOwnProperty(uniqueKey)
            || (
                latestPastLogDict[uniqueKey].blockNumber < log.blockNumber
                || (
                    latestPastLogDict[uniqueKey].blockNumber == log.blockNumber
                    && latestPastLogDict[uniqueKey].blockNumber.logIndex < log.logIndex
                )
            )
        )
    ) {
        latestPastLogDict[uniqueKey] = log;
    }
}

function getCctpV2FastBurnUsdcAllowanceApi(isTestnet) {
    var pathname = `/v2/fastBurn/USDC/allowance`

    var baseUrlApi = new URL(isTestnet ? cctpApiEndpoint.testnet : cctpApiEndpoint.mainnet);
    baseUrlApi.pathname = pathname;

    // console.log("req url:", baseUrlApi.toString())
    return baseUrlApi.toString()
}

async function getCctpV2FastBurnUsdcAllowance(isTestnet, options) {
    var {timeout} = Object.assign({}, {timeout: expiredDuration.timeout3Second}, options);
    var baseUrlApi = getCctpV2FastBurnUsdcAllowanceApi(isTestnet);

    // console.log("req url:", baseUrlApi.toString())
    var res = await axios.get(baseUrlApi, {timeout});
    // res.data: { allowance: 9596478.309529, lastUpdated: '2025-06-13T07:14:58.314Z' }
    const { allowance } = res.data;
    const result = allowance * 10**6;
    return result;
}

function getCircleForwardBurnUsdcFeeRateApi(isTestnet, sourceDomainId, destDomainId, options) {
    var {includeAtaCreation} = Object.assign({}, {includeAtaCreation: false}, options);
    var pathname = `/v2/burn/USDC/fees/${sourceDomainId}/${destDomainId}`;
    var baseUrlApi = new URL(isTestnet ? cctpApiEndpoint.testnet : cctpApiEndpoint.mainnet);
    baseUrlApi.pathname = pathname;
    baseUrlApi.searchParams.append('forward', 'true');
    if (includeAtaCreation) {
        baseUrlApi.searchParams.append('includeAtaCreation', 'true');
    }

    // console.log("req url:", baseUrlApi.toString())
    return baseUrlApi.toString()
}

function getCctpV2FastBurnUsdcFeeRateApi(isTestnet, sourceDomainId, destDomainId) {
    var pathname = `/v2/burn/USDC/fees/${sourceDomainId}/${destDomainId}`;

    var baseUrlApi = new URL(isTestnet ? cctpApiEndpoint.testnet : cctpApiEndpoint.mainnet);
    baseUrlApi.pathname = pathname;

    // console.log("req url:", baseUrlApi.toString())
    return baseUrlApi.toString()
}

async function fetCctpV2FastBurnUsdcFee(log, isTestnet, sourceDomainId, destDomainId, timeout, options) {
    var {includeAtaCreation} = Object.assign({}, {includeAtaCreation: false}, options);
    var operationFeeUrlApi = getCctpV2FastBurnUsdcFeeRateApi(isTestnet, sourceDomainId, destDomainId);
    var forwardFeeUrlApi = getCircleForwardBurnUsdcFeeRateApi(isTestnet, sourceDomainId, destDomainId, {includeAtaCreation});
    var urlApis = [forwardFeeUrlApi, operationFeeUrlApi];

    // console.log("req urlApis:", urlApis)
    // console.time("allSettled")
    var array = await Promise.allSettled(urlApis.map(url => axios.get(url, {timeout})));
    // console.log("allSettled result:", array);
    var data = new Array(array.length);
    for (var i = 0; i < array.length; i++) {
        const response = array[i];
        // console.log("response:", response, response.status)
        if (response.status == "fulfilled") {
            data[i] = response.value?.data;
        } else {
            if (response.reason?.response?.data) {
                // rejected by circle iris
                data[i] = {error: response.reason?.response?.data};
            } else {
                // rejected by other error: such as timemout
                data[i] = {error: getError(response.reason)};
            }
        }
    }
    var [forwardFeeData, operationFeeData] = data;
    // console.timeEnd("allSettled")
    // console.log("forwardFeeData:", forwardFeeData, "operationFeeData:", operationFeeData);
    if (forwardFeeData?.error) {
        if (operationFeeData.error) {
            throw new Error(`fetch circle CCTP transfer fee failed: ${operationFeeData.error}`);
        }
        log.error("fetCctpV2FastBurnUsdcFee ===>", "skip forward fee error:", forwardFeeData.error, "for", forwardFeeUrlApi, "using common cctp v2 instead of circle forwarder");
    }
    return forwardFeeData?.error ? operationFeeData : forwardFeeData;
}

async function getCctpV2FastBurnUsdcFeeRate(log, isTestnet, sourceDomainId, destDomainId, options) {
    var {timeout, includeAtaCreation} = Object.assign({}, {timeout: expiredDuration.timeout3Second, includeAtaCreation: false}, options);
    var data = await fetCctpV2FastBurnUsdcFee(log, isTestnet, sourceDomainId, destDomainId, timeout, {includeAtaCreation});
    // console.log("getCctpV2FastBurnUsdcFeeRate ===>", data, "CCTP_FEE_DENOMINATOR:", CCTP_FEE_DENOMINATOR);
    if (data.error) {
        throw new Error(`fetch circle CCTP transfer fee failed: ${data.error}`);
    }
    var dict = data.reduce((reduced, next) => {
        /* common cctp:    [{ finalityThreshold: 1000, minimumFee: 1 },{ finalityThreshold: 2000, minimumFee: 0 }] */
        /* circle forward:
        [
            {finalityThreshold: 1000,minimumFee: 0,forwardFee: { low: 200000, med: 200000, high: 200000 }},
            {finalityThreshold: 2000,minimumFee: 0,forwardFee: { low: 200000, med: 200000, high: 200000 }}
        ]
        */
        reduced[next.finalityThreshold] = {minimumFee: next?.minimumFee};
        if (next.hasOwnProperty("forwardFee")) {
            // reduced[next.finalityThreshold].forwardFee = next?.forwardFee?.med;
            reduced[next.finalityThreshold].forwardFee = next?.forwardFee?.high;
        }
        return reduced;
    }, {}); // { 1000: 1, 2000: 0 }
    // console.log("getCctpV2FastBurnUsdcFeeRate ===>", "CCTP_FEE_DENOMINATOR:", CCTP_FEE_DENOMINATOR, "dict:", dict);
    // var feeRate = (dict[cctpTransferMode.fastTransfer].minimumFee || 0) / CCTP_FEE_DENOMINATOR;
    var feeRate = new BigNumber(dict[cctpTransferMode.fastTransfer].minimumFee || 0).div(new BigNumber(CCTP_FEE_DENOMINATOR)).toString(10)
    var forwardFee = dict[cctpTransferMode.fastTransfer]?.forwardFee;
    return [feeRate, forwardFee];
}

async function getCctpV2FastBurnUsdcFeeRateV1(log, isTestnet, sourceDomainId, destDomainId, options) {
    var {timeout} = Object.assign({}, {timeout: expiredDuration.timeout3Second}, options);
    var baseUrlApi = getCctpV2FastBurnUsdcFeeRateApi(isTestnet, sourceDomainId, destDomainId);

    // console.log("req url:", baseUrlApi.toString())
    var res = await axios.get(baseUrlApi, {timeout})
    // [{"finalityThreshold":1000,"minimumFee":0},{"finalityThreshold":2000,"minimumFee":0}]
    // console.log("getCctpV2FastBurnUsdcFeeRate ===>", res.data, "CCTP_FEE_DENOMINATOR:", CCTP_FEE_DENOMINATOR);
    var dict = res.data.reduce((reduced, next) => {
        reduced[next.finalityThreshold] = next.minimumFee;
        return reduced;
    }, {}); // { 1000: 1, 2000: 0 }
    // console.log("getCctpV2FastBurnUsdcFeeRate ===>", "CCTP_FEE_DENOMINATOR:", CCTP_FEE_DENOMINATOR, "dict:", dict);
    var feeRate = (dict[cctpTransferMode.fastTransfer] || 0) / CCTP_FEE_DENOMINATOR;
    return feeRate;
}


exports.bitcoinLib = bitcoinLib;
exports.encodeTopic = encodeTopic;
exports.parseLogs = parseLogs;
exports.calcFuncSignature = calcFuncSignature;
exports.calcEventSignature = calcEventSignature;
exports.parseEventAbi = parseEventAbi;
exports.parseFuncAbi = parseFuncAbi;
exports.decodeLogs = decodeLogs;
exports.updateLatestPastLogDict = updateLatestPastLogDict;
exports.getCctpV2FastBurnUsdcAllowance = getCctpV2FastBurnUsdcAllowance;
exports.getCctpV2FastBurnUsdcFeeRate = getCctpV2FastBurnUsdcFeeRate;