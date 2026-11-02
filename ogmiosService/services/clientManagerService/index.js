
const ServiceFramework = require("../../framework/ServiceFramework");

const LOOP_INTERVAL = 10000;
const LOOP_COUNT_SIZE = 10;
const CON_ERR_RATIO = 0.5;

const idleSleep = function (time) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(time, 0)));
};

class ClientManager {

  constructor() {
    this.conIndex = 0;
    this.conTs = 0;
    this.conNumTotal = 0;
    this.conNumFail = 0;
    this.ogmiosServerOptionList = [];
  }

  async init() {
    this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
    this.ogmiosServerOptionList = await this.configService.getGlobalConfig("ogmiosServerCfgList");

    this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
  }

  getSwitchConnection(bSwitch = false) {
    if (bSwitch == false)
      return this.ogmiosServerOptionList[this.conIndex];

    const length = this.ogmiosServerOptionList.length;
    this.conIndex = (this.conIndex + 1) % length;
    return this.ogmiosServerOptionList[this.conIndex];
  }

  async forceSwitch() {
    try {
      let connectioOption = this.getSwitchConnection(true);
      console.log("...forceSwitch...", this.conIndex);
      this.logUtilSrv.logInfo("ClientManager", "forceSwitch", this.conIndex);
      await this.routerService.serviceHandler.forceSwitch(connectioOption);
    }
    catch (e) {
    }
  }

  resetConData() {
    this.conTs = Date.now() / 1000;
    this.conNumTotal = 0;
    this.conNumFail = 0;
  }

  resetConCounterData() {
    this.conNumTotal = 0;
    this.conNumFail = 0;
  }

  async checkRouterService() {
    let routerService = ServiceFramework.getService("EndPointServiceInterface", "OgmiosRouterService");
    while (routerService == undefined) {
      await idleSleep(5000);
      routerService = ServiceFramework.getService("EndPointServiceInterface", "OgmiosRouterService");
    }
    
    this.routerService = routerService;
  }

  async performLoopCheck() {
    if (this.routerService.serviceHandler.queryClient == null) {
      this.conNumTotal++;
      this.conNumFail++;
      if (this.conNumTotal >= LOOP_COUNT_SIZE && this.conNumFail / this.conNumTotal > CON_ERR_RATIO) {
        this.resetConData();
        await this.forceSwitch();
        return true;
      }
    }

    try {
      this.conNumTotal++;
      await this.routerService.serviceHandler.queryClient.networkTip();
    }
    catch (e) {
      this.conNumFail++;
    }

    if (this.conNumTotal >= LOOP_COUNT_SIZE && this.conNumFail / this.conNumTotal > CON_ERR_RATIO) {
      this.resetConData();
      await this.forceSwitch();
      return true;
    }

    //TODO. May check con duration and force switch accordingly.
    let curTs = Date.now() / 1000;
    if (curTs >= 2400 + this.conTs) {
      this.resetConData();
      await this.forceSwitch();
      return true;
    }

    if (this.conNumTotal >= LOOP_COUNT_SIZE) {
      console.log("...performLoopCheck.LOOP_COUNT_SIZE...passed");
      this.logUtilSrv.logInfo("ClientManager", "performLoopCheck.LOOP_COUNT_SIZE...passed");
      this.resetConCounterData();
    }

    return false;
  }

  async start() {
    await this.checkRouterService();
    await idleSleep(20000);

    console.log("...ClientManager.start...");
    let bSwitched = false;
    this.resetConData();
    for (; ;) {

      bSwitched = await this.performLoopCheck();
      if (bSwitched) {
        await idleSleep(20000);
      }
      else {
        await idleSleep(LOOP_INTERVAL);
      }
    }
  }

}

module.exports = ClientManager;