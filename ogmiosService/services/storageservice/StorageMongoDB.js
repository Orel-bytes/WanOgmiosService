const Mongoose = require('mongoose');
const StorageProviderInterface = require('../../interfaces/StorageServiceInterface').StorageProviderInterface;
const Schema = Mongoose.Schema;

class StorageMongoDB extends StorageProviderInterface{

    constructor(dbFile, schema) {
        super(dbFile,schema);

        this.dataSchema = new Schema(schema);  
        this.dataModel = Mongoose.model(dbFile, this.dataSchema);
    }

    async find(id) {
        
        let query = {"id": id}; 
        let findResult = await this.dataModel.find(query); 
      
        return findResult;
    }

    async insert(doc) {
        if(null == doc){
          return;
        }
      
        // insert the new record
        let ret = await this.dataModel.create(doc); 
        return ret;
    }

   async findByOption(query = {}, sort = {}, limit = 1) {
        let findResult = await this.dataModel.find(query).sort(sort).limit(limit);
        return findResult;
    }

    async findAllByOption(query = {}, sort = {}) {
        let findResult = await this.dataModel.find(query).sort(sort);
        return findResult;
    }

    async update(id, newDoc) {
        
        let query = {"id": id}; 
        let record = await this.dataModel.find(query); 

        record["status"] = newDoc["status"];
        let ret = await record.save();

        return ret;
    }

    async updateByOption(query, update) {  
        try {
            if (!query) {
                return false;
            }
            if (!update) {
                return false;
            }

            return await this.dataModel.update(query, update);
        }
        catch (err) {
            console.log("err message:", err.message);
            console.log("err stack:", err.stack);
        }
    }

    async updateOneByOption(query, update) {
        try {
            if (!query) {
                return false;
            }
            if (!update) {
                return false;
            }

            return await this.dataModel.updateOne(query, update);
        }
        catch (err) {
            console.log("err message:", err.message);
            console.log("err stack:", err.stack);
        }
    }

    async updateManyByOption(query, updates) {
        if (!query) {
            return false;
        }
        if (!updates) {
            return false;
        }
        return await this.dataModel.updateMany(query, updates);
    }

    async delete(id) {        
        let query = {"id": id}; 

        let ret = await this.dataModel.remove(query);
        return ret;
    }

    async deleteByOption(query = {}) {
        let ret = await this.dataModel.deleteMany(query); 
        return ret;
    }
}

module.exports = StorageMongoDB;