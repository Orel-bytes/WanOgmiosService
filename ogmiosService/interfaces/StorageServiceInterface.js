/*

    If you want to using you own Database back-end, you should implement DBInterface and TableInterface,
    then call DbHelper::setDbProvider in the dbHelper.js file.

    Important:

    1) all return value is Promise, this is the rule you should obey.

    2) if pass-in wrong filter object/expression, Exception will raised. So you should surround invoke by try-catch.

 */
// 数据库由db.manifest和多个xxx.db文件组成
// db.manifest中记录数据库中所以表的信息
// xxx.db代表一个表，记录所有该表的数据。
class StorageServiceInterface {

    constructor(dbDir,StorageProvider) {
        if (new.target === StorageServiceInterface) {
            throw new TypeError("Cannot construct Abstract class directly");
        }
    }
    async init() {
        throw new Error("Abstract method!");
    }
    
    // createTable创建一个新的，表名不能重复。
    //schema格式示例：
    // const schema = {
    //     name: 'dbname',  //表名
    //     fields: [  //字段定义
    //         { name: 'filed1', primary: true, type: 'string', required: true },                   //name:字段名，primary:是否为主键(只能有一个主键),
    //         { name: 'filed2', primary: false, type: 'object', required: false, default: {} },    //type:数据类型(只支持string,obj,integer,bool)
    //         { name: 'filed3', primary: false, type: 'integer', required: false, default: 0 }     // required:字段值是否能空缺，default:默认值，如果字段值空缺则数据库自动填充默认值
    //     ]
    // }
    //  
    // async initDB(schema)
    async initDB(schema){
        throw new Error("Abstract method!");
    }

    async find(tableName,id) {
        throw new Error("Abstract method!");
    }

    async findByOption(tableName, option, sort = {}, paging = { start: 0}) {
        throw new Error("Abstract method!");
    }
}

class StorageProviderInterface{

    constructor(dbFile, schema) {
        if (new.target === StorageProviderInterface) {
            throw new TypeError("Cannot construct Abstract class directly");
        }
    }

    async find(id) {
        throw new Error("Abstract method!");
    }

    async insert(doc) {
        throw new Error("Abstract method!");
    }

    async findByOption(option, sort = {}, paging = { start: 0}) {
        throw new Error("Abstract method!");
    }

    async update(id, newDoc) {
        throw new Error("Abstract method!");
    }

    async updateByOption(option, newDoc) {
        throw new Error("Abstract method!");
    }

    async delete(id) {
        throw new Error("Abstract method!");
    }

    async deleteByOption(option) {
        throw new Error("Abstract method!");
    }

}

module.exports = {
    StorageServiceInterface: StorageServiceInterface,
    StorageProviderInterface: StorageProviderInterface
}
