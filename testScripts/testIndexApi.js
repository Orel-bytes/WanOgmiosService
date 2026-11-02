const axios = require("axios");

class IndexApiSyncClient {
  constructor(cfg) {
    this.maestroCfg = cfg;

    this.axios_instance = axios.create({
      baseURL: this.maestroCfg.url,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.maestroCfg.apiKey
      }
    }
    );
  }



  async protocolParameters() {
    let url = 'protocol-parameters';
    let res = await this.axios_instance.get(url);
    if (res.status === 200) {
      console.log("\n\n\n...IndexApiSyncClient...protocolParameters...ret: ", res.data.data);
      return res.data.data;
    } else {
      return undefined;
    }
  }

  async get_block(height = 'latest') {
    let url = `blocks/${height}`;
    let ret = await this.axios_instance.get(url);
    console.log("\n\n\n...IndexApiSyncClient...get_block...ret: ", ret);
    if (ret.status === 200) {
      return ret.data.data;
    }
  }

}


async function testMaestro(){

  let bMainnet = false;

  let preprodConfig = {
        url: "https://preprod.gomaestro-api.org/v1",
        apiKey:"9aH4vWoJYPJbmJ6biJzOz9mxzjhFHm3E"
   };

  let mainnetConfig = {
      url: "https://mainnet.gomaestro-api.org/v1",
      apiKey: "RCdVvIrl3cfyLXprkX17CYTCU9heZBUY"
    }

  let indexApiConfig = bMainnet ? mainnetConfig: preprodConfig; 
  console.log("\n\n...indexApiConfig: ", indexApiConfig);
  let indexApiSyncClient = new IndexApiSyncClient(indexApiConfig);

  // let ret = await indexApiSyncClient.get_block(4367022);
  let ret = await indexApiSyncClient.protocolParameters();
  let plutusCostModels = {
    "plutus:v1" : ret.plutus_cost_models.plutus_v1,
    "plutus:v2" : ret.plutus_cost_models.plutus_v2,
    "plutus:v3" : ret.plutus_cost_models.plutus_v3
  };
  console.log("\n\n...ret.plutusCostModels: ", plutusCostModels);


}


testMaestro();


