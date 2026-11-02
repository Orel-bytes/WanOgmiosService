class ContextServiceInterface{
    constructor(storageService){
        if (new.target === ContextServiceInterface) {
            throw new TypeError("Cannot construct Abstract class directly");
        }
        this.storageService = storageService;
        this.context = {};
        this.password = undefined;
    }
    async getContext(name){
        throw new Error("Abstract method!");
    }
    async setContext(name,context){
        throw new Error("Abstract method!");
    }

    async unlock(password){
        throw new Error("Abstract method!");
    }
    async isLocked(){
        throw new Error("Abstract method!");
    }
    async getPassword(account){
        return this.context[account].password;
    }
}

module.exports = ContextServiceInterface;