
class EndPointServiceInterface {
    
    /**
     *Creates an instance of EndPointServiceInterface.
     * @memberof EndPointServiceInterface
     */
    constructor() {
        if (new.target === EndPointServiceInterface) {
            throw new TypeError("Cannot construct Abstract class directly");
        }
    }

    /**
     *
     * @memberof EndPointServiceInterface
     */
    async init(){
        throw new Error("Abstract method!");
    }

    /**
     *
     * @memberof EndPointServiceInterface
     */
    async handlerRequest(router, postData){
        throw new Error("Abstract method!");
    }
    
}

module.exports = EndPointServiceInterface;
