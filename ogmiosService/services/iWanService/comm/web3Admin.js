'use strict';
var core = require('web3-core');

module.exports = {
    extend: (web3) => {
        function insertMethod(name, call, params, inputFormatter, outputFormatter) {
            return new web3.extend.Method({ name, call, params, inputFormatter, outputFormatter });
        }

        // function insertProperty(name, getter, outputFormatter) {
        //     return new web3.extend.Property({ name, getter, outputFormatter });
        // }
        function insertProperty(name, getter, outputFormatter) {
            return new web3.extend.Method({ name, call: getter, outputFormatter });
        }

        // ADMIN
        web3.extend({
            property: 'admin',
            methods:
            [
                insertMethod('addPeer', 'admin_addPeer', 1, [null], web3.extend.formatters.formatOutputBool),
                insertMethod('exportChain', 'admin_exportChain', 1, [null], null),
                insertMethod('importChain', 'admin_importChain', 1, [null], null),
                insertMethod('verbosity', 'admin_verbosity', 1, [web3.extend.utils.formatInputInt], web3.extend.formatters.formatOutputBool),
                insertMethod('setSolc', 'admin_setSolc', 1, [null], web3.extend.formatters.formatOutputString),
                insertMethod('startRPC', 'admin_startRPC', 4, [null, web3.extend.utils.formatInputInteger, null, null], web3.extend.formatters.formatOutputBool),
                insertMethod('stopRPC', 'admin_stopRPC', 0, [], web3.extend.formatters.formatOutputBool),
            ],
            properties:
            [
                insertProperty('nodeInfo', 'admin_nodeInfo', web3.extend.formatters.formatOutputString),
                insertProperty('peers', 'admin_peers', null),
                insertProperty('datadir', 'admin_datadir', web3.extend.formatters.formatOutputString),
                insertProperty('chainSyncStatus', 'admin_chainSyncStatus', null),
            ],
        });

        // DEBUG
        web3.extend({
            property: 'debug',
            methods:
            [
                insertMethod('printBlock', 'debug_printBlock', 1, [web3.extend.formatters.formatInputInt], web3.extend.formatters.formatOutputString),
                insertMethod('getBlockRlp', 'debug_getBlockRlp', 1, [web3.extend.formatters.formatInputInt], web3.extend.formatters.formatOutputString),
                insertMethod('setHead', 'debug_setHead', 1, [web3.extend.formatters.formatInputInt], web3.extend.formatters.formatOutputBool),
                insertMethod('processBlock', 'debug_processBlock', 1, [web3.extend.formatters.formatInputInt], null),
                insertMethod('seedHash', 'debug_seedHash', 1, [web3.extend.formatters.formatInputInt], web3.extend.formatters.formatOutputString),
                insertMethod('dumpBlock', 'debug_dumpBlock', 1, [web3.extend.formatters.formatInputInt], null),
            ],
            properties: [],
        });

        // MINER
        web3.extend({
            property: 'miner',
            methods:
            [
                insertMethod('start', 'miner_start', 1, [web3.extend.formatters.formatInputInt], web3.extend.formatters.formatOutputBool),
                insertMethod('stop', 'miner_stop', 1, [web3.extend.formatters.formatInputInt], web3.extend.formatters.formatOutputBool),
                insertMethod('setExtra', 'miner_setExtra', 1, [null], web3.extend.formatters.formatOutputBool),
                insertMethod('setGasPrice', 'miner_setGasPrice', 1, [web3.extend.utils.fromDecimal], web3.extend.formatters.formatOutputBool),
                insertMethod('startAutoDAG', 'miner_startAutoDAG', 0, [], web3.extend.formatters.formatOutputBool),
                insertMethod('stopAutoDAG', 'miner_stopAutoDAG', 0, [], web3.extend.formatters.formatOutputBool),
                insertMethod('makeDAG', 'miner_makeDAG', 1, [web3.extend.formatters.inputDefaultBlockNumberFormatter], web3.extend.formatters.formatOutputBool),
            ],
            properties:
            [
                insertProperty('hashrate', 'miner_hashrate', web3.extend.utils.toDecimal),
            ],
        });

        // Wan
        web3.extend({
            property: 'eth',
            methods:
            [
                insertMethod('getWanAddress', 'wan_getWanAddress', 1, [web3.extend.formatters.inputAddressFormatter], web3.extend.formatters.formatOutputString),
                insertMethod('getOTAMixSet', 'wan_getOTAMixSet', 2,[null, null]),
                insertMethod('checkOTAUsed', 'wan_checkOTAUsed', 1,[null])
            ],
            properties:
            [],
        });
        web3.extend({
            property: 'personal',
            methods:
            [
                insertMethod('updateAccount', 'personal_updateAccount', 3, [web3.extend.formatters.inputAddressFormatter,null,null]),
            ],
            properties:
            [],
        });
        // NETWORK
        web3.extend({
            property: 'network',
            methods:
            [
                insertMethod('getPeerCount', 'net_peerCount', 0, [], web3.extend.formatters.formatOutputString),
            ],
            properties:
            [
                insertProperty('listening', 'net_listening', web3.extend.formatters.formatOutputBool),
                insertProperty('peerCount', 'net_peerCount', web3.extend.utils.toDecimal),
                insertProperty('peers', 'net_peers', null),
                insertProperty('version', 'net_version', web3.extend.formatters.formatOutputString),
            ],
        });

        // TX POOL
        web3.extend({
            property: 'txpool',
            methods: [],
            properties:
            [
                insertProperty('status', 'txpool_status', null),
            ],
        });

        //POS
        web3.extend({
            property: 'pos',
            methods: [
                new web3.extend.Method({
                    name: 'version',
                    call: 'pos_version',
                    params: 0
                }),

                new web3.extend.Method({
                    name: 'getSlotLeadersByEpochID',
                    call: 'pos_getSlotLeadersByEpochID',
                    params: 1
                }),

                new web3.extend.Method({
                    name: 'getEpochLeadersByEpochID',
                    call: 'pos_getEpochLeadersByEpochID',
                    params: 1
                }),

                new web3.extend.Method({
                    name: 'getLeaderGroupByEpochID',
                    call: 'pos_getLeaderGroupByEpochID',
                    params: 1
                }),

                new web3.extend.Method({
                    name: 'getSmaByEpochID',
                    call: 'pos_getSmaByEpochID',
                    params: 1
                }),

                new web3.extend.Method({
                    name: 'getRandomProposersByEpochID',
                    call: 'pos_getRandomProposersByEpochID',
                    params: 1
                }),

                new web3.extend.Method({
                    name: 'getSlotScCallTimesByEpochID',
                    call: 'pos_getSlotScCallTimesByEpochID',
                    params: 1
                }),

                new web3.extend.Method({
                    name: 'getSlotCreateStatusByEpochID',
                    call: 'pos_getSlotCreateStatusByEpochID',
                    params: 1
                }),

                new web3.extend.Method({
                    name: 'getRandom',
                    call: 'pos_getRandom',
                    params: 2
                }),
                new web3.extend.Method({
                    name: 'getSijCount',
                    call: 'pos_getSijCount',
                    params: 2
                }),
                new web3.extend.Method({
                    name: 'getReorg',
                    call: 'pos_getReorg',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getEpochStakerInfo',
                    call: 'pos_getEpochStakerInfo',
                    params: 2
                }),
                new web3.extend.Method({
                    name: 'getEpochStakerInfoAll',
                    call: 'pos_getEpochStakerInfoAll',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getLocalPK',
                    call: 'pos_getLocalPK',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getBootNodePK',
                    call: 'pos_getBootNodePK',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getEpochIncentivePayDetail',
                    call: 'pos_getEpochIncentivePayDetail',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getTotalIncentive',
                    call: 'pos_getTotalIncentive',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getEpochIncentive',
                    call: 'pos_getEpochIncentive',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getEpochRemain',
                    call: 'pos_getEpochRemain',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getTotalRemain',
                    call: 'pos_getTotalRemain',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getIncentiveRunTimes',
                    call: 'pos_getIncentiveRunTimes',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getEpochGasPool',
                    call: 'pos_getEpochGasPool',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getStakerInfo',
                    call: 'pos_getStakerInfo',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getRBAddress',
                    call: 'pos_getRBAddress',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getIncentivePool',
                    call: 'pos_getIncentivePool',
                    params: 1
                }),

                new web3.extend.Method({
                    name: 'getActivity',
                    call: 'pos_getActivity',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getSlotActivity',
                    call: 'pos_getSlotActivity',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getValidatorActivity',
                    call: 'pos_getValidatorActivity',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getEpochID',
                    call: 'pos_getEpochID',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getSlotID',
                    call: 'pos_getSlotID',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getSlotCount',
                    call: 'pos_getSlotCount',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getSlotTime',
                    call: 'pos_getSlotTime',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getMaxStableBlkNumber',
                    call: 'pos_getMaxStableBlkNumber',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'calProbability',
                    call: 'pos_calProbability',
                    params: 2
                }),
                new web3.extend.Method({
                    name: 'getEpochIDByTime',
                    call: 'pos_getEpochIDByTime',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getSlotIDByTime',
                    call: 'pos_getSlotIDByTime',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getTimeByEpochID',
                    call: 'pos_getTimeByEpochID',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getPosInfo',
                    call: 'pos_getPosInfo',
                    params: 0
                }),
                new web3.extend.Method({
                    name: 'getEpochIncentiveBlockNumber',
                    call: 'pos_getEpochIncentiveBlockNumber',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getEpochStakeOut',
                    call: 'pos_getEpochStakeOut',
                    params: 1
                }),
                new web3.extend.Method({
                    name: 'getEpochBlock',
                    call: 'pos_getEpochBlock',
                    params: 1
                }),
            ]
        });
    },
};
