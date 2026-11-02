let StorageServiceInterface = require('../../interfaces/StorageServiceInterface').StorageServiceInterface;
const Mongoose = require('mongoose');

class StorageService extends StorageServiceInterface {
    
    constructor(dbUrl,StorageProvider){
        super(dbUrl,StorageProvider);

        // dbDir = MONGODB_URL + RP_DBNAME
        this.m_dburl = dbUrl;
        this.StorageProvider = StorageProvider;
        this.dbInstMap = new Map();
    }

    async init() {
        // Mongoose.set('useCreateIndex', true);
        this.rpMongooseDB = await Mongoose.connect(this.m_dburl, { useNewUrlParser: true,useUnifiedTopology: true });
    }

    async initDB(dataSchema) {        
        if(this.dbInstMap.has(dataSchema.name)){
            console.log('the collection is already existed: ' + dataSchema.name);
            return false;
        } 

        let dbInst = new this.StorageProvider(dataSchema.name, dataSchema.schema);
        this.dbInstMap.set(dataSchema.name, dbInst);

        return dbInst;
    }

    async find(name,id) {
        if(!this.dbInstMap.has(name)) {
            throw Error(name+' not existed');
        }

        return await this.dbInstMap.get(name).find(id);
    }

    async findByOption(name, option = {}, sort = {}, paging = { start: 0}) {
        if(!this.dbInstMap.has(name)) {
            throw Error(name+' not existed');
        }

        return await this.dbInstMap.get(name).findByOption(option, sort, paging );
    }

    async getDBIns(name) {
        if(!this.dbInstMap.has(name)) {
            throw Error(name+' not existed');
        }

        return await this.dbInstMap.get(name);
    }

}

module.exports = StorageService
