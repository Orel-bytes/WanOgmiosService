class APIServiceInterface {

    constructor() {
        if (new.target === APIServiceInterface) {
            throw new TypeError("Cannot construct Abstract class directly");
        }
    }

    async init(){ 
        throw new Error("Abstract method!");
    }

    async startUp(){
        throw new Error("Abstract method!");
    }

};

module.exports = APIServiceInterface;
