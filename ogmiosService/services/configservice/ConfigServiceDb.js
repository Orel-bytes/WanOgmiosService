const path = require('path')
const { optionsConfig } = require('../../../config/options');

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');




class ConfigServiceDb {
    constructor(name) {
        console.log("origin optionsConfig:", optionsConfig)
        const adapter = new FileSync(path.join(optionsConfig.cfgDir, name));
        this.db = low(adapter);
        let cfgDb = this.db.value()
        console.log("cfgDb:", cfgDb)
        this.cfg = Object.assign(optionsConfig, cfgDb)
        console.log("ConfigServiceDb constructor this.cfg:", this.cfg)
    }
    setCfg(key, value) {
        if (this.db.get(key).value()) {
            this.db.update(key, value).write()
        } else {
            this.db.set(key, value).write()
        }

        this.cfg = Object.assign(this.cfg, { [key]: value })
    }
    getCfg(key) {
        if (key) {
            return this.cfg[key]
        } else {
            return this.cfg
        }
    }
}

module.exports.ConfigServiceDb = ConfigServiceDb