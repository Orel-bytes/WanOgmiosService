const _ = require('lodash');
const cfg = require('../../../config/options');
const ConfigServiceInterface = require('../../interfaces/ConfigServiceInterface');
const fs = require('fs');
const path = require('path');


function listFile(directory) {
    //转换为绝对路径
    let dir = path.resolve(directory);
    let stats = fs.statSync(dir);
    let fileList = []
    //如果是目录的话，遍历目录下的文件信息
    if (stats.isDirectory()) {
        let file = fs.readdirSync(dir);
        file.forEach((e) => {
            //遍历之后递归调用查看文件函数
            //遍历目录得到的文件名称是不含路径的，需要将前面的绝对路径拼接
            var absolutePath = path.resolve(path.join(dir, e));
            fileList = fileList.concat(listFile(absolutePath));
        })
    } else {
        //如果不是目录，打印文件信息
        if (path.parse(dir).ext === '.json') {
            // console.log(param);
            fileList.push(dir);
        }
    }
    return fileList
}

class ConfigServiceJson extends ConfigServiceInterface {
    constructor(cfgDir) {
        super(cfgDir);
        this.cfg = cfg;
        //this.schema = {
        //    name: 'ConfigServiceJson',
        //    fields: [
        //        { name: 'configName', primary: true, type: 'string', required: true },
        //        { name: 'configValue', primary: false, type: 'string', required: true },
        //    ]
        //}
    }
    async init() {
        //// await super.init();
        let cfgFileList = listFile(this.cfgDir);
        for (let index = 0; index < cfgFileList.length; index++) {
            const cfgFile = cfgFileList[index];
		console.log("\n\n..configservice..cfgFile:", cfgFile);
            let cfg = JSON.parse(fs.readFileSync(cfgFile));
            if (!this.cfg[cfg.serviceType]) this.cfg[cfg.serviceType] = {};
            this.cfg[cfg.serviceType][cfg.serviceName] = cfg.config;
        }
    }
    async getConfig(serviceType, serviceName, propertyPath) {
        let fullPropertyPath = serviceType + '.' + serviceName;
        if (propertyPath && propertyPath !== '.') fullPropertyPath = fullPropertyPath + '.' + propertyPath;
        let ret = _.get(this.cfg, fullPropertyPath);

        return ret;
    }
    async getGlobalConfig(name) {
        return _.get(this.cfg, name);
    }
}

module.exports = ConfigServiceJson;
