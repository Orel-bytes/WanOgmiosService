'use strict';

const Web3Contract = require('web3-eth-contract');
const libMultiCall = require('./comm/lib/multiCall');
const Web3 = require("web3");

class ChainUtil {

  constructor(nodeUrl, configurationScDict) {
    this.nodeUrl = nodeUrl;
    this.configurationScDict = configurationScDict;
    this.DEFAULT_TIMEOUT_CREATE_RPC = 30000;
  }

  getWeb3Client(){

    let timeoutMs = this.DEFAULT_TIMEOUT_CREATE_RPC;
    let keepAlive = false;
    // console.log("\n\n...getSolInterface this.nodeUrl: ", this.nodeUrl);
    this.provider = new Web3.providers.http.HttpProvider(this.nodeUrl, { timeout: timeoutMs, keepAlive: keepAlive });
    try {
      this.web3Client = new Web3.Web3(this.provider);
    } catch (err) {
      console.error("new client for WAN error:", err);
      throw new Error(`failed to create WAN chain rpc client`);
    } 
  }

  async getSolInterface(abi, contractAddr, contractFunc) {
    this.getWeb3Client();

    let conInstance = new Web3Contract.Contract(abi, contractAddr);
    conInstance.setProvider(this.provider);

    return conInstance.methods[contractFunc];
  }

  async getTotalTokenPairsByCrossConfig() {

    const { address, abi, multicallAddr } = this.configurationScDict; // need to check the abi path config for abi file

    const getCrossTokenPairLengthFunc = await this.getSolInterface(abi, address, "getCrossTokenPairLength");    
    const totalTokenPairLength = await getCrossTokenPairLengthFunc().call();
    console.log("\n\n\n...getCrossTokenPairLengthFunc: ", totalTokenPairLength);

    const maxQueryCountPerRequest = libMultiCall.DEFAULTR_MAX_QUERY_COUNT_PER_REQUEST;
    let tokenPairPos = new Array(totalTokenPairLength);
    for (let i = 0; i < totalTokenPairLength; ++i) {
      tokenPairPos[i] = i;
    }

    const delimiter = "|"
    const multiCalls4TokenPairs = (tokenPairPos.map((pos) => {
      return {
        address: address
        , funcName: "getTokenPairInfoAt"
        , inputTypes: ["uint256"]
        , outputTypes: [{ "components": [{ "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "uint256", "name": "ancestorChainID", "type": "uint256" }, { "internalType": "uint256", "name": "fromChainID", "type": "uint256" }, { "internalType": "uint256", "name": "toChainID", "type": "uint256" },{ "internalType": "bytes", "name": "ancestorAccount", "type": "bytes" }, { "internalType": "bytes", "name": "fromAccount", "type": "bytes" }, { "internalType": "bytes", "name": "toAccount", "type": "bytes" }, { "internalType": "string", "name": "ancestorName", "type": "string" }, { "internalType": "string", "name": "ancestorSymbol", "type": "string" },{ "internalType": "uint8", "name": "ancestorDecimals", "type": "uint8" }],"internalType": "structStructLib.TokenPairInfo", "name": "info", "type": "tuple" }]
        , outputNames: [`${pos}${delimiter}tokenPair`]
        , args: [pos]
        }
    }));
    const multiStepTokenPairs = await libMultiCall.chainMultiCall(this.web3Client, multiCalls4TokenPairs, multicallAddr, maxQueryCountPerRequest);

    const multiCalls4TokenTypes = (tokenPairPos.map((pos) => {
      return {
        address: address
        , funcName: "getTokenPairTypeAt"
        , inputTypes: ["uint256"]
        , outputTypes: [{"internalType": "uint256", "name": "id",	"type": "uint256"}, {"internalType": "uint8",	"name": "tokenPairType", "type": "uint8"}]
        , outputNames: [`${pos}${delimiter}tokenPair`]
        , args: [pos]
      }
    }));
    const multiStepTokenTypes = await libMultiCall.chainMultiCall(this.web3Client, multiCalls4TokenTypes, multicallAddr, maxQueryCountPerRequest);
    let mapTokenPairId2Types = new Map();
    for (const multiTokenTypes of multiStepTokenTypes) {
      for (const info of multiTokenTypes.result) {
        // console.log("..multiTokenTypes info: ", info);
        let tokenPairId = info.id;
        let tokenType = info.tokenPairType;
        mapTokenPairId2Types.set(tokenPairId, tokenType);
      }
    }   
    
    let tokenPairDict = {};
    for (const multiTokenPairs of multiStepTokenPairs) {
      for (const info of multiTokenPairs.result) {
        for (const resName in info) {
          const [pos, field] = resName.split(delimiter);
          tokenPairDict[pos] || (tokenPairDict[pos] = {});

          let currTpInfo = Object.assign({}, info[resName]);
          const allKeys = Object.keys(currTpInfo);
          if (info[resName].length !== allKeys.length) {
            for (let i = 0; i < info[resName].length; ++i) {
              delete currTpInfo[i];
            }
            tokenPairDict[pos] = { ...tokenPairDict[pos], ...currTpInfo };
          } else {
            tokenPairDict[pos][field] = info[resName];            
          }

          let tokenType = mapTokenPairId2Types.get(tokenPairDict[pos].id);
          tokenPairDict[pos].tokenType = tokenType;
        }
      }
    }
    return Object.values(tokenPairDict);
  }

}


module.exports = ChainUtil;

