
class ServiceFramework {

    constructor(options) {
        this.serviceRegistry = {};
    }

    registerService(serviceType, serviceName, serviceInstance) {
        this.serviceRegistry[serviceType] = this.serviceRegistry[serviceType] || {};
        this.serviceRegistry[serviceType][serviceName] = serviceInstance;
    }

    getService(serviceType, serviceName) {
        return this.serviceRegistry[serviceType][serviceName];
    }

}

let serviceFramework = new ServiceFramework();

module.exports = serviceFramework;
