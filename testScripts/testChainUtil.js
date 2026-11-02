
const ChainUtil = require("../ogmiosService/services/IWanService/ChainUtils");

const TOKENTYPE_ERC721 = "1";
const TOKENTYPE_ERC1155 = "2";

class TestChainUtil {

  constructor(nodeUrl, configurationScDict) {

    this.chainUtilInst = new ChainUtil(nodeUrl, configurationScDict);
  }

  init() {
    this.chainUtilInst.getWeb3Client();
  }

  async getTokenPairsFromOnChain() {
    try {
      this.tokenPairsInfo = await this.chainUtilInst.getTotalTokenPairsByCrossConfig();
      // console.log("\n\n *****getTokenPairsFromOnChain: ", this.tokenPairsInfo);

      for(let i=0; i<this.tokenPairsInfo.length; i++){
        let tokenType = this.tokenPairsInfo[i].tokenType;
        
        if((TOKENTYPE_ERC1155 === tokenType) ||(TOKENTYPE_ERC721 === tokenType)){
          console.log("*****getTokenPairType: ",  this.tokenPairsInfo[i]);
        }
      }

      return this.tokenPairsInfo ;

    } catch (error) {
      console.log("\n\n TestChainUtil getTotalTokenPairsByCrossConfig takes exception: ", error);
      throw "TestChainUtil getTotalTokenPairsByCrossConfig failed!"
    }
  }

  async getTokenPairTypeFromOnChain(index) {
    try {
      let {id, tokenPairType} = await this.chainUtilInst.getTokenPairType(index);
      if((TOKENTYPE_ERC1155 === id) ||(TOKENTYPE_ERC721 === id)){
        console.log("*****getTokenPairType: ", index, id, tokenPairType);
      }


    } catch (error) {
      console.log("\n\n TestChainUtil getTokenPairType takes exception: ", error);
      throw "TestChainUtil getTokenPairType failed!"
    }
  }

}


async function test() {

  let bMainnet = false;
 
  let mainnetDomain_no1 =  "https://gwan2-ssl.wandevs.org/";
  let mainnetDomain_no2 =  "https://gwan-ssl.wandevs.org:56891/";
  let mainnetDomain_no3 =  "https://nodes.wandevs.org/wan";

  const nodeUrl =  bMainnet ? "https://nodes.wandevs.org/wan" : "https://nodes-testnet.wandevs.org/wan"; 

  const configurationScDict =   bMainnet ? {
        address: '0x6Dc2fC72584BfFa35Cc6D521a22081dD0217f3b6',
        abi: require("./abi/abi.ConfigurationDelegate.json"),
        multicallAddr: "0x0575344f57a655f9a76f9546d8b53cdecf94eec9"
    } : {
        address: '0x86704C09EE544cF5e3BA2f92E35d1f65f10F7014',
        abi: require("./abi/abi.ConfigurationDelegate.json"),
        multicallAddr: "0xFe3359b5C97191c4E2543dC7aC675d8BD947dE57"
  };

  let testChainUtilObj = new TestChainUtil(nodeUrl, configurationScDict);
  testChainUtilObj.init();
  let tokenPairs = await testChainUtilObj.getTokenPairsFromOnChain();

}


test();

