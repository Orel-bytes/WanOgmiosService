

const fs = require('fs');
const cbor = require('cbor');
const BlockFrostAPI = require('@blockfrost/blockfrost-js').BlockFrostAPI;


class BlockFrostSDK{

  constructor(){

    this.blockFrostApi =  new BlockFrostAPI({projectId:'preprod2CkSg6ILU3vxDMRn2EOO6hwXtUAOceDF'});

    this.scanSteps = 10; // should record in config file
    this.retryTimeInterval = 60*1000;
  }



  async queryAgentUtxos(){
     
    // to query utxo of agent's account
    this.agentAddress = "addr_test1qq0rlnqmmmrl4wzy35nt0pzsuu88h78swk4wnjrpzy8yk62mqlt3z2733rdlarwrd0l9sgx5t99qgsejv52qrzwmm8hqfvmgam";
    let agentUtxos = await this.blockFrostApi.addressesUtxos(this.agentAddress);
    // this.chainTxHandler.syncUtxoRecord(agentUtxos);

    console.log("\n\n...queryAgentUtxos: ", agentUtxos);
    return;
  }

  async queryTx(){
    let txInfo = undefined;

    try{
      txInfo = await this.blockFrostApi.txs("4821e71fbb1dcedfc4cce6a3207dbc2c24c8f5d8291b8929a87ae61986d26c5a");
      console.log("\n\n...txInfo: ", txInfo);

    }catch(e){
      console.log("\n\n...get txInfo error: ", e);
    }

    console.log("\n\n...queryTx: ", txInfo);
    return txInfo;
  }

  async queryBlock(blockHeight){
    let blockInfo = undefined;

    try{
      blockInfo = await this.blockFrostApi.blocks(blockHeight);
      console.log("\n\n...blockInfo: ", blockInfo);

    }catch(e){
      console.log("\n\n...get blockInfo error: ", e);
    }

    return blockInfo;
  }
}

let checkTokenPolicyIdCfg =  [
  "4295914ef5ff86204642d3334ee444f9dafc694b4da246b39b68fbb0",
  "2707ef39e2521117d2d3851ef80ad17737eb8294a58397948aa28568"
];
let checkTokenRegexOption = new Array();
for (let i = 0; i < checkTokenPolicyIdCfg.length; i++) {
  let tmpRegex = eval("/^" + checkTokenPolicyIdCfg[i] + './');
  let tokenRegexItem = {
    "tokenId": { $regex: tmpRegex }
  }
  checkTokenRegexOption.push(tokenRegexItem);
}

let blocksOption = {
  "blockTxs.treasury_related": true,
  "blockHeight": {
    $gte: 10000,
    $lt: 10100
  }
};

console.log("\n\n...checkTokenRegexOption: ", checkTokenRegexOption, blocksOption);

let blockFrostObj = new BlockFrostSDK();

let txInfo = blockFrostObj.queryTx();

// let blockHeight = 991079;
// let blockInfo = blockFrostObj.queryBlock(blockHeight);

