class ChainSyncServiceInterface {
    constructor(){
        if (new.target === ChainSyncServiceInterface) {
            throw new TypeError("Cannot construct Abstract class directly");
        }
    }

    /**
     * initialize the wallet
     *
     * @param {*} option
     * @memberof ChainSyncServiceInterface
     */
    async init(){
        throw new Error("Abstract method!");
    }


    /**
     * get the private key of the specified account
     *
     * @memberof ChainSyncServiceInterface
     */
    async startUp(){
        throw new Error("Abstract method!");
    }

}

module.exports = ChainSyncServiceInterface;