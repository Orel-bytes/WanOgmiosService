const UtilServiceInterface = require("../../interfaces/UtilServiceInterface");
const CryptoJS = require("crypto-js");
const Web3 = require("web3");
const web3 = new Web3();

class Web3UtilService extends UtilServiceInterface {

  /**
   *Creates an instance of Web3UtilService.
   * @memberof Web3UtilService
   */
  constructor() {
    super();
  }

  /**
   * @param {*} hexStr
   * @memberof UtilServiceInterface
   */
  convertHexToAscii(hexStr) {
    let wrp = hexStr.toLowerCase();
    return wrp; //web3.utils.hexToAscii(hexStr).replace(/\u0000/g, "");
  }

  /**
   * @param {*} asciiStr
   * @memberof UtilServiceInterface
   */
  convertAsciiToHex(asciiStr) {
    let encodedRpCode = '0x' + CryptoJS.SHA256(asciiStr);
    let wrp = encodedRpCode.toLowerCase();
    return wrp;
  }

  /**
   * @param {*} address
   * @memberof UtilServiceInterface
   */
  isValidAddress(address) {
    return web3.utils.isAddress(address);
  }

  /**
   * parse contract event
   *
   * @param {*} logs
   * @param {*} abi
   * @memberof UtilServiceInterface
   */
  parseLogs(logs, abi) {
    if (logs === null || !Array.isArray(logs)) {
      return logs;
    }

    return logs.map(function (log) {
      let abiJson = abi.find(function (json) {
        return (json.type === 'event' && web3.eth.abi.encodeEventSignature(json) === log.topics[0]);
      });

      if (abiJson) {
        try {
          //topics without the topic[0] if its a non-anonymous event, otherwise with topic[0].
          log.topics.splice(0, 1);
          let args = web3.eth.abi.decodeLog(abiJson.inputs, log.data, log.topics);
          for (var index = 0; index < abiJson.inputs.length; index++) {
            if (args.hasOwnProperty(index)) {
              delete args[index];
            }
          }
          log.eventName = abiJson.name;
          log.args = args;
          return log;
        } catch (err) {
          console.log(err);
          return log;
        }
      } else {
        return log;
      }
    });
  }

  /**
   * @param {*} scAbi
   * @param {*} scAddress
   * @memberof UtilServiceInterface
   */
  getContractInst(scAbi, scAddress) {
    let scInst = new web3.eth.Contract(scAbi, scAddress);
    return scInst;
  }

  /**
   * @param {*} value
   * @memberof UtilServiceInterface
   */
  toHex(value) {
    return web3.toHex(value);
  }

  /**
   * @param {*} value
   * @memberof UtilServiceInterface
   */
  toDecimal(value) {
    return web3.toDecimal(value);
  }

  /**
   * @param {*} value
   * @memberof UtilServiceInterface
   */
  toBigNumber(value) {
    return web3.utils.toBN(value);
  }

}

module.exports = Web3UtilService;
