class ConfigServiceInterface{
    constructor(cfgDir){
        if (new.target === ConfigServiceInterface) {
            throw new TypeError("Cannot construct Abstract class directly");
        }
        this.cfgDir = cfgDir;
    }
    
    async init(){
    }
    async getConfig(serviceType,serviceName,propertyPath){
        throw new Error("Abstract method!");
    }

    async getGlobalConfig(name){
        throw new Error("Abstract method!");
    }
}

module.exports = ConfigServiceInterface;