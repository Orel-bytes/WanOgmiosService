class AgentServiceInterface {
    constructor(){
        if (new.target === AgentServiceInterface) {
            throw new TypeError("Cannot construct Abstract class directly");
        }
    }

    /**
     * initialize the wallet
     *
     * @param {*} option
     * @memberof AgentServiceInterface
     */
    async init(){
        throw new Error("Abstract method!");
    }


    /**
     * get the private key of the specified account
     *
     * @memberof AgentServiceInterface
     */
    async startUp(){
        throw new Error("Abstract method!");
    }

}

module.exports = AgentServiceInterface;