
class ServiceFramework {

    constructor(options) {
        this.serviceRegistry = {};
    }

    registerService(serviceType, serviceName, serviceInstance) {
        this.serviceRegistry[serviceType] = this.serviceRegistry[serviceType] || {};
        this.serviceRegistry[serviceType][serviceName] = serviceInstance;
    }

    getService(serviceType, serviceName) {
        try{

            return this.serviceRegistry[serviceType][serviceName];
            
        }catch(e){
            return undefined;
        }
    }

}

let serviceFramework = new ServiceFramework();

module.exports = serviceFramework;
