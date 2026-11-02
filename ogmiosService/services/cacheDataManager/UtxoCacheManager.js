
const Heap = require('heap');
const ServiceFramework = require("../../framework/ServiceFramework");
const { sleep } = require('../utilService/commonUtils');

const TOP_N = 5;
const CACHE_CLEAN_INTERVAL_MS = 10 * 60 * 1000;  // 10 min
const LOOP_INTERVAL = 5000; // 5 second
const TTL_MS = 30 * 1000;  // 1 minutes

const idleSleep = function (time) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(time, 0)));
};


/**
 * UtxoCacheManager
 *
 * Manages caching for Ogmios UTXO queries to reduce RPC load.
 */
class UtxoCacheManager {
    /**
     * @param {number} ttlMs - Time to live in milliseconds (default: 15*1000 = 1 minutes)
     */
    constructor(ttlMs = TTL_MS) {
        this.ttlMs = ttlMs;
        this.cache = new Map();
        this.reqAddressCounter = new Map();
        this.lastCleanupTime = Date.now();
        this.logUtilSrv = null;
        this.routerService = null;

        this.mapAddressUtxoLocker = new Map();
    }

    async init() {
        await this._getServiceInstance();
    }

    async _getServiceInstance() {
        this.logUtilSrv = ServiceFramework.getService("UtilServiceInterface", "Log4UtilService");
        this.routerService = ServiceFramework.getService("EndPointServiceInterface", "OgmiosRouterService");

        this.configService = ServiceFramework.getService("ConfigServiceInterface", "ConfigServiceJson");
        this.dataSourceType = await this.configService.getGlobalConfig("dataSourceType");
    }

    /**
     * when service available，return true, otherwise false
     * @returns {Promise<boolean>}
     */
    async checkRouterService() {
        if (!this.routerService) {
            await this._getServiceInstance();
        }
        return !!this.routerService;
    }

    /**
     * Perform periodic cleanup of cache and stats
     */
    _tryPerformCleanup() {
        const now = Date.now();
        if (now - this.lastCleanupTime > CACHE_CLEAN_INTERVAL_MS) {
            // Clear addressStatistics
            this.reqAddressCounter.clear();

            // Clean expired cache entries
            for (const [key, value] of this.cache.entries()) {
                if (now - value.respTS > this.ttlMs) {
                    this.cache.delete(key);
                }
            }

            this.lastCleanupTime = now;
        }
    }

    /**
     * Generate a consistent cache key for a filter item
     * Handles key sorting to ensure deterministic keys for objects
     * @param {any} item
     * @returns {string}
     */
    _createKey(item) {
        if (typeof item === 'string') {
            return item;
        }
        // Handle UTXO object: { transaction: { id: "..." }, index: ... }
        if (item?.transaction?.id && item.index !== undefined) {
            return `${item.transaction.id}:${item.index}`;
        }

        throw new Error(`Unsupported filter item`);
        // // Fallback for safety
        // return JSON.stringify(item, (key, value) =>
        //     typeof value === 'bigint' ? value.toString() : value
        // );
    }

    /**
     * Check if a UTXO matches a filter item
     * @param {Object} utxo
     * @param {any} filterItem
     * @returns {boolean}
     */
    _matches(utxo, filterItem) {
        if (typeof filterItem === 'string') {
            return utxo?.address === filterItem;
        }
        if (filterItem && filterItem.transaction?.id && typeof filterItem.index !== 'undefined') {
            if (utxo?.transaction?.id && typeof utxo?.index !== 'undefined') {
                return utxo.transaction.id === filterItem.transaction.id && utxo.index === filterItem.index;
            }
        }
        return false;
    }

    /**
     * Get UTXOs, using cache if available and fresh
     * @param {Object|Array} utxoFilter - The filter for UTXO query (address array or UTXO ref array)
     * @returns {Promise<any>} The UTXO data
     */
    async getUtxo(utxoFilter) {

        let queryPayload = [];

        try {
            const isArray = Array.isArray(utxoFilter);
            const items = isArray ? utxoFilter : [utxoFilter];
            if (!items || items.length === 0 || items.length > 1) return [];

            const flatResults = [];
            const kind = typeof items[0] === 'string' ? 'address' : 'ref';
            const target = [];

            // to generate target objects { Item, Item_Key }
            items.forEach(item => {
                // create key for item
                const key = this._createKey(item); // key is the index for item

                // to renew address statistic
                if (kind === 'address') {
                    const counter = (this.reqAddressCounter.get(key) || 0) + 1;
                    this.reqAddressCounter.set(key, counter);
                }

                target.push({ item, key });
            });
            console.log(`\n\nUtxoCacheManager::getUtxo(${JSON.stringify(utxoFilter)}) target: `, target);

            // to check the cache data in memory
            let checkRet = this.checkCacheData(target);
            if (true === checkRet.bAvailable) {
                return checkRet.cacheData;
            }

            // if there is no available cache data in memory
            if (target.length > 0) {
                queryPayload = target.map(x => x.item);

                // get locker for target address
                await this.getAddressLocker(queryPayload);

                // re-check the cache data
                let checkRet = this.checkCacheData(target);
                if (true === checkRet.bAvailable) {
                    // need to release the address's locker
                    this.releaseAddressLocker(queryPayload);
                    return checkRet.cacheData;
                }

                // to get utxo onchain
                const requestTime = Date.now();
                const response = await this.getUtxoFromUpStream(queryPayload);
                const responseTime = Date.now();
                // this.logUtilSrv?.logInfo("UtxoCacheManager", `getUtxo(${JSON.stringify(utxoFilter)}) response: `, response);
                const utxos = Array.isArray(response) ? response : (response ? [response] : []);
                // this.logUtilSrv?.logInfo("UtxoCacheManager", `getUtxo(${JSON.stringify(utxoFilter)}) utxos: `, utxos);

                const buckets = new Map();
                target.forEach(m => buckets.set(m.key, []));

                for (const utxo of utxos) { // Group UTXOs by filter item of 'utxoFilter'
                    for (const m of target) {
                        if (this._matches(utxo, m.item)) {
                            buckets.get(m.key).push(utxo);
                        }
                    }
                }
                for (const m of target) {
                    const data = buckets.get(m.key);
                    this.cache.set(m.key, { reqTS: requestTime, respTS: responseTime, data });
                }

                flatResults.push(...utxos);
            }

            // need to release the address's locker
            this.releaseAddressLocker(queryPayload);

            console.log(`\n\nUtxoCacheManager::getUtxo(${JSON.stringify(utxoFilter)}) return utxo len: `, flatResults.length);
            this.logUtilSrv?.logInfo("UtxoCacheManager", `getUtxo(${JSON.stringify(utxoFilter)}) return utxo len: `, flatResults.length);
            return flatResults;

        } catch (error) {
            // need to release the address's locker
            this.releaseAddressLocker(queryPayload);

            console.log(`\n\nUtxoCacheManager::getUtxo(${JSON.stringify(utxoFilter)})  catch error: `, error);
            this.logUtilSrv?.logError("UtxoCacheManager", `getUtxo(${JSON.stringify(utxoFilter)}) catch error: `, error);
            return undefined;
        }
    }

    checkCacheData(target) {
        let flatResults = new Array();
        const now = Date.now();

        // to check the cache data in memory
        for (const m of target) {
            const cached = this.cache.get(m.key);
            if (cached && now - cached.respTS < this.ttlMs) {
                if (Array.isArray(cached.data)) flatResults.push(...cached.data);
            } else {
                let ret = {
                    "bAvailable": false,
                    "cacheData": undefined
                }
                this.logUtilSrv?.logInfo("UtxoCacheManager", "checkCacheData", "no available cache data for target address");
                return ret;
            }
        }

        let ret = {
            "bAvailable": true,
            "cacheData": flatResults
        }
        this.logUtilSrv?.logInfo("UtxoCacheManager", "checkCacheData ret: ", ret);
        return ret;
    }

    async getAddressLocker(aryAddress) {
        for (let i = 0; i < aryAddress.length; i++) {
            let targetAddr = aryAddress[i];
            while (this.mapAddressUtxoLocker.get(targetAddr)) {
                await sleep(1000);
            }

            this.mapAddressUtxoLocker.set(targetAddr, true);
        }
    }


    releaseAddressLocker(aryAddress) {
        for (let i = 0; i < aryAddress.length; i++) {
            let targetAddr = aryAddress[i];
            this.mapAddressUtxoLocker.set(targetAddr, false);
        }
    }

    async getUtxoFromUpStream(queryPayload) {
        this.logUtilSrv?.logInfo("UtxoCacheManager", "getUtxoFromUpStream queryPayload: ", queryPayload);

        let ret = undefined;
        if (2 === this.dataSourceType) {
            // if (typeof queryPayload[0] !== 'string') throw new Error('Index API currently not supported query by UTXO-Ref');
            if (typeof queryPayload[0] !== 'string') {
                ret = await this.routerService.serviceHandler?.indexApiClient?.query_utxo_by_output_reference_ary(queryPayload);
            } else {
                ret = await this.routerService.serviceHandler?.indexApiClient?.query_utxo_by_addresses(queryPayload);
            }
            this.logUtilSrv?.logInfo("UtxoCacheManager", "getUtxoFromUpStream from indexApi ret: ", ret);

        } else if (3 === this.dataSourceType) {
            if (typeof queryPayload[0] !== 'string') {
                ret = await this.routerService.serviceHandler?.blockfrostClient?.queryUtxosByRef(queryPayload);
            } else {
                ret = await this.routerService.serviceHandler?.blockfrostClient?.queryAddressUtxos(queryPayload);
            }
            this.logUtilSrv?.logInfo("UtxoCacheManager", "getUtxoFromUpStream from blockfrost ret: ", ret);

        } else {
            let params = typeof queryPayload[0] === 'string' ? { "addresses": queryPayload } : { "outputReferences": queryPayload };
            ret = await await this.routerService.serviceHandler?.queryClient?.utxo(params);
            this.logUtilSrv?.logInfo("UtxoCacheManager", "getUtxoFromUpStream from ogmios ret: ", ret);
        }

        return ret;
    }

    /**
     * Clear the entire cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Remove a specific filter from cache
     * @param {Object|Array} utxoFilter
     */
    invalidate(utxoFilter) {
        const items = Array.isArray(utxoFilter) ? utxoFilter : [utxoFilter];
        items.forEach(item => {
            const key = this._createKey(item);
            this.cache.delete(key);
        });
    }

    /**
     * Refresh the cache for the top N most frequent addresses
     * Uses Heap algorithm to efficiently find top frequent items
     */
    async refreshTopNFrequentItems() {
        if (this.reqAddressCounter.size === 0) return;

        this.logUtilSrv.logInfo(`UtxoCacheManager::refreshTopNFrequentItems() this.reqAddressCounter.size = `, this.reqAddressCounter.size);

        const entries = [];
        for (const [address, counter] of this.reqAddressCounter.entries()) {
            entries.push({ address, counter });
        }

        // Use Heap to find top N (treating higher count as larger)
        const topItems = Heap.nlargest(entries, TOP_N, (a, b) => a.counter - b.counter);
        const topAddresses = topItems.map(item => item.address);

        if (topAddresses.length > 0) {
            // Fetch and re-cache (only fetches if expired or missing)
            try {
                await this.getUtxo(topAddresses);
            } catch (error) {
                console.error('Failed to refresh top N items:', error);
            }
        }
    }

    async loopTask(taskId, taskFunc) {
        for (; ;) {
            try {
                const isServiceOK = await this.checkRouterService();
                if (!isServiceOK) {
                    await idleSleep(1000);
                    continue;
                }

                await taskFunc();
                // Perform periodic cleanup
                this._tryPerformCleanup();
            } catch (e) {
                this.logUtilSrv.logError(`UtxoCacheManager '${taskId}' catch error: `, e);
            }
            await idleSleep(LOOP_INTERVAL);
        }
    }

    async startUp() {
        this.logUtilSrv.logInfo("UtxoCacheManager::start...");

        this.loopTask("task_refreshUtxo", () => this.refreshTopNFrequentItems());  // call refreshTopNFrequentItems() periodically, every LOOP_INTERVAL (10s) !
    }
}

module.exports = UtxoCacheManager;
