

const ServiceFramework = require("../../framework/ServiceFramework");
const BlockFrostChecker = require("./BlockFrostChecker");
const MaestroChecker = require("./MaestroChecker");



class RecordSecurityHandler {
  constructor(securityConfirmEnable, tokenFilterOption, mapDbInstance, securityConfirmCfg) {

    // security check config
    this.securityConfirmEnable = securityConfirmEnable;
    this.tokenFilterOption = tokenFilterOption;
    this.blockInfoDbInst = mapDbInstance.get("blockRecord");
    this.mintInfoDbInst = mapDbInstance.get("mintRecord");

    // module config
    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");

    // security checker instance
    this.securityChecker = undefined;
    if ("blockFrost" === securityConfirmCfg.externalSource) {
      this.securityChecker = new BlockFrostChecker(securityConfirmCfg.blockFrostConfig);
      this.securityChecker.init();

    } else if ("maestro" === securityConfirmCfg.externalSource) {
      this.securityChecker = new MaestroChecker(securityConfirmCfg.maestroConfig);
      this.securityChecker.init();
    }
  }

  async fetchBlockInfosByOption(filterOption, sort = {}, limit = undefined) {

    try {
      let blockInfos = undefined;
      if (undefined !== limit) {
        blockInfos = await this.blockInfoDbInst.findByOption(filterOption, sort, limit);
      } else {
        blockInfos = await this.blockInfoDbInst.findAllByOption(filterOption, sort);
      }

      console.log("\n\n...fetchBlockInfosByOption...blockInfos: ", filterOption, blockInfos);
      return blockInfos;

    } catch (e) {
      this.logUtilSrv.logInfo('RecordSecurityHandler', 'fetchBlockInfosByOption...:', e);
      return undefined;
    }
  }

  async processTreasuryRelatedTxCheck(blocksOption, sort = {}, limit = undefined) {

    // Step 1: to get blocks which take treasury_related tx
    let blockInfos = await this.fetchBlockInfosByOption(blocksOption, sort, limit);
    this.logUtilSrv.logInfo('RecordSecurityHandler', 'blocksOption:', blocksOption);
    this.logUtilSrv.logInfo('RecordSecurityHandler', 'fetchBlockInfosByOption:', blockInfos);
    if (undefined === blockInfos) {
      console.log("\n\n....checkConfirmBlockEnd...fetchBlockInfosByOption error: ", blocksOption);
      let ret = {
        "confirmedRslt": false,
        "confirmedLen": undefined
      };
      return ret;
    }
    console.log("\n\n....checkConfirmBlockEnd...fetchBlockInfosByOption blockInfos: ", blockInfos.length);

    for (let index = 0; index < blockInfos.length; index++) {
      let blockHash = blockInfos[index].hash;
      let blockHeight = blockInfos[index].blockHeight;
      let blockTxs = blockInfos[index].blockTxs;

      let bCheckFailed = false;
      // to check treasury related tx security
      for (let i = 0; i < blockTxs.length; i++) {
        let txHash = blockTxs[i].tx_hash;

        if ((true === blockTxs[i].treasury_related) || (true === blockTxs[i].nftTreasury_related)) {

          if (true === this.securityConfirmEnable) {
            let checkRslt = await this.securityChecker.confirmTxSecurity(txHash, blockHash, blockHeight);
            console.log("\n\n...RecordSecurityHandler...confirmTxSecurity...checkRslt:", txHash, checkRslt);

            if (false === checkRslt) {
              this.logUtilSrv.logInfo('RecordSecurityHandler', 'tx confirm failed:', txHash);
              blockTxs[i].security_Confirmed = false;
              bCheckFailed = true;
              this.logUtilSrv.logInfo('RecordSecurityHandler', 'tx confirm failed in block:', blockHeight);
              break;
            }
          }

          blockTxs[i].security_Confirmed = true;
        }
      }

      // to update blockInfo db data
      try {
        // take blockHash && blockHash both as filter condition
        let blockFilter = {
          "blockHeight": blockHeight,
          "hash": blockHash
        };
        let blockOption = {
          $set: {
            "blockTxs": blockTxs
          }
        };
        await this.blockInfoDbInst.updateByOption(blockFilter, blockOption);
        console.log("\n\n...RecordSecurityHandler...finish block security confirm:", blockFilter, blockOption);
        this.logUtilSrv.logInfo('\n\nSecurityRecordHandler', 'finish block security confirm:', blockFilter);

        if (bCheckFailed) {
          this.logUtilSrv.logInfo('RecordSecurityHandler', 'tx confirm failed during process:', blockHeight);
          let ret = {
            "confirmedRslt": false,
            "confirmedLen": undefined
          };
          return ret;
        }

      } catch (e) {
        this.logUtilSrv.logInfo('RecordSecurityHandler', 'block security confirm failed...:', e);
        let ret = {
          "confirmedRslt": false,
          "confirmedLen": undefined
        };
        return ret;
      }
    }

    let ret = {
      "confirmedRslt": true,
      "confirmedLen": blockInfos.length
    };
    return ret;
  }

  async processMintTxCheck(mintTxOption, sort = {}, limit = undefined) {
    // step 1: to get mint txs based on block scope
    let mapTxId2BlockNo = new Map();
    let uniquedTxIds = new Array();

    let mapBlockNum2Infos = new Map();
    let uniqueBlockNos = new Array();

    this.logUtilSrv.logInfo('RecordSecurityHandler', 'tokenFilterOption...', this.tokenFilterOption);
    console.log("\n\n\n\n***...RecordSecurityHandler...tokenFilterOption:", this.tokenFilterOption);

    let mintRecordLen = 0;
    try {
      let mintTxs = undefined;
      if (undefined !== limit) {
        mintTxs = await this.mintInfoDbInst.findByOption(mintTxOption, sort, limit);
      } else {
        mintTxs = await this.mintInfoDbInst.findAllByOption(mintTxOption, sort);
      }
      console.log("\n\n\n\n***...RecordSecurityHandler...mintTxs:", mintTxOption, mintTxs);
      this.logUtilSrv.logInfo('RecordSecurityHandler', 'mintTxOption...', mintTxOption);
      this.logUtilSrv.logInfo('RecordSecurityHandler', 'mintTxs...', mintTxs);

      // to unique txId && blockHeight
      mintRecordLen = mintTxs.length;
      for (let i = 0; i < mintTxs.length; i++) {
        let txId = mintTxs[i].txId;
        let blockHeight = mintTxs[i].blockHeight;

        // to unique txId list
        if (undefined === mapTxId2BlockNo.get(txId)) {
          uniquedTxIds.push(txId);
          mapTxId2BlockNo.set(txId, blockHeight);
        }

        // to unique blockHeight list
        if (undefined === mapBlockNum2Infos.get(blockHeight)) {
          uniqueBlockNos.push(blockHeight);
          mapBlockNum2Infos.set(blockHeight, {});
        }
      }

    } catch (e) {
      this.logUtilSrv.logInfo('RecordSecurityHandler', 'get mint tx failed...', e);
      let ret = {
        "confirmedRslt": false,
        "confirmedLen": undefined
      };
      return ret;
    }

    this.logUtilSrv.logInfo('RecordSecurityHandler', 'uniqueBlockNos...', uniqueBlockNos);
    if (0 === uniqueBlockNos.length) {
      let ret = {
        "confirmedRslt": true,
        "confirmedLen": mintRecordLen
      };
      return ret;

    } else {
      let blocksOption = {
        "blockHeight": {
          $in: uniqueBlockNos
        }
      };
      // modify: to fetch related section data
      let blockInfos = await this.fetchBlockInfosByOption(blocksOption);
      if (undefined === blockInfos) {
        console.log("\n\n...processMintTxCheck...blockInfos error.");
        let ret = {
          "confirmedRslt": false,
          "confirmedLen": undefined
        };
        return ret;
      }

      console.log("\n\n...processMintTxCheck...blockInfos: ", uniqueBlockNos, blocksOption, blockInfos);
      for (let k = 0; k < blockInfos.length; k++) {
        mapBlockNum2Infos.set(blockInfos[k].blockHeight, blockInfos[k]);
      }
    }

    this.logUtilSrv.logInfo('RecordSecurityHandler', 'uniquedTxIds...', uniquedTxIds);
    // step 2: to check the security of mint tx 
    for (let j = 0; j < uniquedTxIds.length; j++) {
      let mintTxId = uniquedTxIds[j];
      let blockHeight = mapTxId2BlockNo.get(mintTxId);
      let blockHash = mapBlockNum2Infos.get(blockHeight).hash;

      if (true === this.securityConfirmEnable) {
        let checkRslt = await this.securityChecker.confirmTxSecurity(mintTxId, blockHash, blockHeight);
        console.log("\n\n...RecordSecurityHandler...mint tx...checkRslt:", mintTxId, checkRslt);
        if (false === checkRslt) {
          this.logUtilSrv.logInfo('RecordSecurityHandler', 'mint tx confirm failed:', mintTxId);
          let ret = {
            "confirmedRslt": false,
            "confirmedLen": undefined
          };
          return ret;
        }
      }
    }

    // step 3: to update the security confirm status for mint tx based on block 
    try {
      let mintTxFilter = {
        "txId": {
          $in: uniquedTxIds
        }
      };
      let mintTxOption = {
        $set: {
          "security_Confirmed": true
        }
      };
      await this.mintInfoDbInst.updateManyByOption(mintTxFilter, mintTxOption);
      console.log("\n\n...processMintTxCheck...update mintInfo: ", uniqueBlockNos, mintTxFilter);

    } catch (e) {
      this.logUtilSrv.logInfo('RecordSecurityHandler', 'mint tx security confirm update failed...', e);
      let ret = {
        "confirmedRslt": false,
        "confirmedLen": undefined
      };
      return ret;
    }

    this.logUtilSrv.logInfo('RecordSecurityHandler', 'processMintTxCheck...finish');
    let ret = {
      "confirmedRslt": true,
      "confirmedLen": mintRecordLen
    };
    return ret;
  }

  async processUtxosAvailableCheck(address, txId, index) {

    if (true === this.securityConfirmEnable) {

      let checkRslt = await this.securityChecker.confirmUtxoSecurity(address, txId, index);
      if (false === checkRslt) {
        this.logUtilSrv.logInfo('RecordSecurityHandler', 'utxo confirm failed:', address, txId, index);
        return false;
      }
    }

    this.logUtilSrv.logInfo('RecordSecurityHandler', 'utxo confirm succeed:', address, txId, index);
    return true;
  }

};

module.exports = RecordSecurityHandler;