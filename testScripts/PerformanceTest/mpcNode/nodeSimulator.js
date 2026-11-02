const axiosUtil = require("../utils/axiosRequest");
const config = require("../config");

class MpcNodeSimulator {
    constructor(){

        // this.ogmiosServer = config.OgmiosServer;//"http://52.13.9.234:4337";
        this.reqObj = new axiosUtil(config.OgmiosServer);
    }

    sleep(time) {
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                resolve();
            }, time);
        })
    }
    
    
    async axiosRequest(cmdId){
    
        console.log("\n\naxios request cmd id:", cmdId);
        let ret = await this.reqObj.handleRequest(cmdId);
        console.log("axios request return:", ret);

    }
    
    async action(){    
        
        do{        
            let cmdId = this.randomNum(0, 10);            
            await this.axiosRequest(cmdId);
    
            await this.sleep(config.NodeAccessInterval);
    
        }while(true);
    
    }
    
    //生成从minNum到maxNum的随机数
    randomNum(minNum,maxNum){ 
        switch(arguments.length){ 
            case 1: 
                return parseInt(Math.random()*minNum+1,10); 
            case 2: 
                return parseInt(Math.random()*(maxNum-minNum+1)+minNum,10); 
            default: 
                return 0; 
        } 
    } 

};


module.exports = MpcNodeSimulator;

