const axios = require('axios');
const utils = require('../ogmiosService/services/utilService/commonUtils');
const { tail } = require('lodash');


class IndexApiClient {
  constructor(cfg) {
    this.maestroCfg = cfg;

    this.axios_instance = axios.create({
      baseURL: this.maestroCfg.url,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.maestroCfg.apiKey
      },
      timeout: 10000
    }
    );
  }

  async chainTip() {
    let url = 'chain-tip';
    let res = await this.axios_instance.get(url);
    if (res.status === 200) {
      return res.data.data;
    } else {
      return undefined;
    }
  }


  async networkBlockHeight() {
    let url = '/blocks/latest';
    let res = await this.axios_instance.get(url);
    // console.log("\n\n networkBlockHeight res: ", res);
    if (res.status === 200) {
      // console.log("\n\n networkBlockHeight res: ", res.data.data.height);
      return res.data.data.height;
    } else {
      return undefined;
    }
  }

  async accountInfo(stakeAddr) {
    let url = `/accounts/${stakeAddr}`;
    let res = await this.axios_instance.get(url);
    if (res.status === 200) {
      console.log("\n\n accountInfo res: ", res.data.data);
      return res.data.data;
    } else {
      return undefined;
    }
  }

  //https://mainnet.gomaestro-api.org/v1/accounts/{stake_addr}/rewards
  async delegationsAndRewards(stakeAddr) {
    let url = `/accounts/${stakeAddr}/rewards`;
    let res = await this.axios_instance.get(url);
    if (res.status === 200) {
      console.log("\n\n delegationsAndRewards res: ", res.data.data);
      return res.data.data;
    } else {
      return undefined;
    }
  }

  async evaluateTx(rawTx) {
    let url = '/transactions/evaluate';
    let payload = {
      cbor: rawTx
    };

    try {
      let res = await this.axios_instance.post(url, payload);
      if (res.status === 200) {
        let formatedRet = utils.convertIndexApiEvaluateRet(res.data);
        console.log("\n\nevaluateTx: ", formatedRet);
        return res.data;
      } else {
        return undefined;
      }
    } catch (error) {
      console.error('Evaluate exception:', error.response?.data);
      return error.response?.data;
    }
  }

  async submitTx(signedTx) {
    let url = '/txmanager'; 
    
    try{
      const data = Buffer.isBuffer(signedTx) ? signedTx : Buffer.from(signedTx.replace(/^0x/, 'hex'), 'hex');
      console.log("\n\nsignedTx: ", data);
      let res = await this.axios_instance.post(url, data, {
        headers: {
          'Content-Type': 'application/cbor',
        }
      });
      
      console.log("\n\nsubmitTx res: ", res);
      if (res.status === 202) {
        console.log("\n\nsubmitTx: ", res.data);
        return res.data;
      } else {
        return undefined;
      }

    }catch(error){
      if (error.response) {
        console.error('Submit exception:', error.response.data.contents.contents.contents);
      }
      return undefined;
    }
  }

  async query_utxo_by_addresses(addressAry) {
    let req_data = addressAry;
    let ret_data = [];
    let cursor = null;

    while (1) {
      let url = 'addresses/utxos?count=100';
      if (cursor) {
        url = `${url}&&cursor=${cursor}`;
        cursor = null;
      }
      let res = await this.axios_instance.post(url, req_data);
      if (res.status === 200) {
        ret_data = ret_data.concat(res.data.data);
        cursor = res.data.next_cursor;
      }
      if (!cursor) {
        break;
      }
    };

    let utxos = [];
    for (let idx = 0; idx < ret_data.length; ++idx) {
      let utxo = utils.convertIndexApiUtxoToMaestro(ret_data[idx]);
      utxos.push(utxo);
    }

    return utxos;
  }


  async query_txRawData_by_txHash(tx_hash) {

    while (1) {
      let url = `transactions/${tx_hash}/cbor`;
      let res = await this.axios_instance.get(url);
      if (res.status === 200) {
        console.log("\n\n tx raw data res: ", res.data.data);
        return res.data.data;
      } else {
        return undefined;
      }
    };
  }

  async query_txInfo_by_txHash(tx_hash) {

    while (1) {
      let url = `transactions/${tx_hash}`;
      let res = await this.axios_instance.get(url);
      if (res.status === 200) {
        console.log("\n\n tx raw data res: ", res.data.data);
        return res.data.data;
      } else {
        return undefined;
      }
    };
  }

    async query_txs_by_policy(policy, fromSlot, toSlot = undefined) {
    if (toSlot === undefined) {
      toSlot = fromSlot;
    }

    let ret_data = [];
    let cursor = null;
    while (1) {
      let url = `policy/${policy}/mints?count=100&order=asc&&from=${fromSlot}&&to=${toSlot}`;
      if (cursor) {
        url = `${url}&&cursor=${cursor}`;
        cursor = null;
      }
      let res = await this.axios_instance.get(url);
      console.log("\n\n...txs: ", res.data.data);
 
      if (res.status === 200) {
        ret_data = ret_data.concat(res.data.data);
        cursor = res.data.next_cursor;
      }
      if (!cursor) {
        break;
      }
    };

    return ret_data;
  }
}




async function main(){
  let indexApiCfg = {
    url: "https://preprod.gomaestro-api.org/v1/",
    apiKey:"9aH4vWoJYPJbmJ6biJzOz9mxzjhFHm3E"
  };

  let indexAPIObj = new IndexApiClient(indexApiCfg);

  // let networkBlockHeight = await indexAPIObj.networkBlockHeight();
  // console.log("\n\n networkBlockHeight: ", networkBlockHeight);

  // let rawTx = "84aa0083825820302fac1b6c550d5530b157c1feeb581366232d0ad4f33ea782bbed3f8d36e8e4038258206359a3b5c77e943a7bbc768bc86f966508b7a376f545a7ff97a4a9fb613ec52e018258207de8ed1bfb04e7f82af755e964ac523c2e4e6e8380f16b5b791492f52f0988e3000184a3005839301c438f7de759204806e28d5fc0a7c5a16d6f532de3ec00d5748c7fc44e83a9652d76167d9289b190def35276bec262fb0cd18caa4a0835d501821a00129c92a1581c4295914ef5ff86204642d3334ee444f9dafc694b4da246b39b68fbb0a14a54436865636b436f696e01028201d81845d8799f01ffa3005839301d92619dfd0e638c96e1e275c8040a2424c22ba8252785d2e682346e4e83a9652d76167d9289b190def35276bec262fb0cd18caa4a0835d5011ad53be154028201d81845d8799f01ff8258390071b0a6ba893eea17c382b0e3a312c53e0304dbd100faf03106e5e5b679c8e5a88f18f747d570eedcec4c75d53a48ee8fbb1edb3855ee92af1a003aedf082583900fc3b5cc22ea1592f12ed29f8cef030b19e69db647955ac96bf5c429afc3b5cc22ea1592f12ed29f8cef030b19e69db647955ac96bf5c429a1a0abc8a3c021a000abfe8031a078e696d07582061bbecbeabd762c5cdcd9661e4738eaa343eaa53355eae5b370c7f051c3ae4f80b58201db167ead9a00636413a96a1f2fe038995c2a84f9468cf6a6123be551ef5ed060d81825820302fac1b6c550d5530b157c1feeb581366232d0ad4f33ea782bbed3f8d36e8e4031082583900fc3b5cc22ea1592f12ed29f8cef030b19e69db647955ac96bf5c429afc3b5cc22ea1592f12ed29f8cef030b19e69db647955ac96bf5c429a1a0ab21e34111a00152bf01283825820a1ebc1744ca07d41e726966e55e01499af31be5746b769cb0fb0d5afae3b4cd200825820b97fe4259c70a0bd9d28ed643107f59632e09913e323fb754719b54a8fca771900825820930e7eadd6909e02d8cef66788e1aeccbb965bad40a1497f3e32ed7ae4053c6800a20081825820894bb0c17bbde8ea1259d34c6876fc72450543f4931e9fe24e9a6cf41ad933405840e4a0b6b519e0805fcd044c62cd5d7c07e56a5a0e1ad59abc89621cae177bfc3f72165664921127ef390c200bf57fc66999ac81847d6aa5828050379dd9e4e2070582840002d87a9fd8799f581c71b0a6ba893eea17c382b0e3a312c53e0304dbd100faf03106e5e5b6581c79c8e5a88f18f747d570eedcec4c75d53a48ee8fbb1edb3855ee92af4040001a003aedf058207de8ed1bfb04e7f82af755e964ac523c2e4e6e8380f16b5b791492f52f0988e300005820e4b9e768cc932ef3720907a4c47c55ab5ed5c81d595b765fb3315de0fa618f33001b0000019f02b485c8015840973d4250266612c5a05665252f60a57cc4a98844dd9de18ab8ba5a5023123a670a699075ff38c3a8b595999c5fc325998834be51c4f588d6120391db54870290ffff821a001286101a1cc7a85b840001d87980821a0021be521a03f65e42f5a101a36b746f6b656e50616972494419020c64747970650268756e6971756549645820e4b9e768cc932ef3720907a4c47c55ab5ed5c81d595b765fb3315de0fa618f33";
  // let evaluateRet = await indexAPIObj.evaluateTx(rawTx);
  
  // let signedTx = "84a90082825820570ea6897c85e6ca55ffda0f5ee8f83cecfd719dd4dab6d9a5f2bdd7a17b6eab00825820570ea6897c85e6ca55ffda0f5ee8f83cecfd719dd4dab6d9a5f2bdd7a17b6eab010182a300581d70f3edaa4ecdb36e331be615eda7c87233e344db93eca1c192e0160ac701821a002d71a2a1581c76c4659b1b328354e6bded80f25b8ea17521584fc9919ef54a3fe86ca15247726f7570496e666f546f6b656e436f696e01028201d8185901afd8799f9f581cf3edaa4ecdb36e331be615eda7c87233e344db93eca1c192e0160ac7581c56eed02841b7835d050d1801ccc61939ce8281026932576db36ef66a58210263250e496f6efd7ad5d600b60be1e3dcbdbb2eeab7b4aefe1987e86a97025ec1581cfc3b5cc22ea1592f12ed29f8cef030b19e69db647955ac96bf5c429a581c1c438f7de759204806e28d5fc0a7c5a16d6f532de3ec00d5748c7fc4581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c6faf1930c605c51b1898c8ca153d675a8d3857eac02fae10da58de4b581c4e83a9652d76167d9289b190def35276bec262fb0cd18caa4a0835d5581c9c2abd15db9e9b27fca7f4b367cc08e28483d4ca05fcc63a3f58413c581ce9f9f6f5bfd064179d663d9258a75931ae00ee0042765ab341c25cf4581c6322159f474733196754316e299fb1327237ac3e8b110bb0147f8043581c98447834ec39b99bbe7b3875d07f7773282853cec6b6bc3eeb968d86581cc01204d5afbb3535fec9566f6512582100f39c938efe76727bf41112581cad297aa2f2441ca8445b5ed3fa4a858d4a9012f6bdb4969519b0e174ffff82583900b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19464578e1dcc55d0e9e8cf70c7afd5d2d48bf032123101941931e3e6b1b000000011a3f614f021a0009a3a00b5820a2cc866deeb10edc329371f9edb354ff5418fbf4a0d9df789057d90aae4d79430d81825820237616197e73201b240bcf894f45b4a27159648a4a5329f64be4a067802a89b9000e81581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e191082583900b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19464578e1dcc55d0e9e8cf70c7afd5d2d48bf032123101941931e3e6b1a00393478111a001316c81281825820e8afb239dd4f9f0b732fc252e3639af06936aadd674231ba784736416c0b070d00a20081825820d95d3f42204efe598586a210b1b56f447cee400af6bb6a0428fdc0263ce8d81658400d5db2ba86cda7b75180e002a43c588c3d06dbed826bb43abded1847078cc7e87a5ddcb9870de626a18d7578f75b402b5948fb7a1d2034a4e6a9015cfe7e830e058184000002821a004c988e1a5479a224f5f6";
  // let submitRet = await indexAPIObj.submitTx(signedTx);

  // let stakeAddr = "stake_test1urekpyl72p28h79wsqasu2k7v5c8gnckyawn6sdjghvucjcp86q35"; //"stake_test1uzyy407v2k5fcvvqcaq5ddd4wflgt77r7sg873ljnkg4r6qssl3wm"; //
  // let rewards = await indexAPIObj.delegationsAndRewards(stakeAddr);


  // let accountInfo = await indexAPIObj.accountInfo(stakeAddr);

  // let addressAry = [ 'addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp' ];
  // let utxosRet = await indexAPIObj.query_utxo_by_addresses(addressAry);
  // console.log("\n\n query_utxo_by_addresses: ", utxosRet);

  let txHash = "0eae31d58c21784b2cc50aa7f36f76439ce00100d21fbf311099e123f28e3828";
  let txRawData = await indexAPIObj.query_txInfo_by_txHash(txHash);

  // let policyId = "d2a8592ec9673ac18fea1044885f94518e954ab0cb2b6bb0a328d2af";
  // let fromSlot = 129455651;
  // let toSlot = 131337006;
  // let txInfo = await indexAPIObj.query_txs_by_policy(policyId, fromSlot, toSlot);

}


main();

