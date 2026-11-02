const ContextServiceInterface = require('../../interfaces/ContextServiceInterface');
var crypto = require('crypto');

class ContextService extends ContextServiceInterface {
    constructor(storageService) {
        super(storageService);

        // this.password = undefined;
        // this.schema = {
        //     name: 'ContextService',
        //     fields: [
        //         { name: 'contextName', primary: true, type: 'string', required: true },
        //         { name: 'contextValue', primary: false, type: 'string', required: true },
        //     ]
        // }
    }


    async getContext(name) {
        return this.context[name];
    }
    async setContext(name, context) {
        this.context[name] = context;
    }

    async unlock(password) {
        let encryptContext = await this.storage.findByOption({ contextName: 'password' });
        if (encryptContext.length <= 0) return false;

        var md5 = crypto.createHash('md5');
        var encryptPassword = md5.update(password).digest('hex');

        if (encryptContext[0].contextValue === encryptPassword) {
            this.password = password;
            return true;
        }
        return false;
    }
    async isLocked() {
        return (this.password === undefined);
    }

}

module.exports = ContextService;