const mongoose = require('mongoose'),
Schema = mongoose.Schema;

module.exports = {
    network: "testnet",
    mongo_url: "mongodb://127.0.0.1:27017/wanOgmiosService_preprod",
    cardanoOgmiosVersion: "v6",
    blockInfoSchema: {
        name: "blockInfo",
        schema: {
            blockHeight: { type: Number, index: true },
            blockHash: { type: String, index: true },
            slot: { type: Number, index: true },
            hash: { type: String },
            time: { type: Number },
            blockType: { type: String },
            blockEra: { type: String },
            blockTxs: { type: Array }
        }
    },
    chainSyncSchema: {
        name: "chainSyncInfo",
        schema: {
            chainType: { type: String, index: true },
            time: { type: Number },
            slot: { type: Number },
            hash: { type: String },
            blockHeight: { type: Number }
        }
    },
    txInfoSchema: {
        name: "txInfo",
        schema: {
            txId: { type: String, index: true },  //txId
            blockHeight: { type: Number, index: true }, // block height
            blockHash: { type: String }, // block hash
            slot: { type: Number, index: true },
            txIndex: { type: Number, index: true },  //tx index in block body
            time: { type: Number },  // block time stamp
            metaData: { type: Schema.Types.Mixed },  // tx meta data
            collaterals: { type: Array },  //tx collaterals input utxo
            inputs: { type: Array },  //tx input utxo
            outputs: { type: Array },  //tx output utxo
            mint: { type: Schema.Types.Mixed },
            redeemers: { type: Schema.Types.Mixed },  //tx redeemers
            datums: { type: Schema.Types.Mixed },
            fee: { type: String }, //tx redeemers
            inputSource: { type: String },
            bMintTask: { type: Boolean, index: true },
            treasury_related: { type: Boolean, index: true },
            bMintedNFT: { type: Boolean, index: true },
            nftTreasury_related: { type: Boolean, index: true },
            bMsgTask: { type: Boolean, index: true }
        }
    },
    mintInfoSchema: {
        name: "mintInfo",
        schema: {
            tokenId: { type: String, index: true },  //policy id of asset
            txId: { type: String, index: true },  //txId
            blockHeight: { type: Number, index: true }, // block height
            slot: { type: Number, index: true },
            mintValue: { type: Number },   // mint value
            security_Confirmed: { type: Boolean, index: true },
            bMintTask: { type: Boolean, index: true },
            bMintedNFT: { type: Boolean, index: true },
            bMsgTask: { type: Boolean, index: true }
        }
    },
    treasuryUtxoInfoSchema: {
        name: "treasuryUtxoInfo",
        schema: {
            utxoId: { type: String, index: true },  // utxoId: txId.txIndex
            txId: { type: String, index: true },  // txId utxo belong to 
            txIndex: { type: Number, index: true },  // utxo index in tx outputs
            blockHeight: { type: Number, index: true }, // block height
            slot: { type: Number, index: true },
            owner: { type: String, index: true },  // utxo owner
            status: { type: Number, index: true }  // utxo status: available(1)/Consumed(0)
        }
    },
    balancedCfgInfoSchema: {
        name: "balancedCfgInfo",
        schema: {
            chainType: { type: String, index: true },
            utxoNumThresheld: { type: Schema.Types.Mixed },  // utxoId: txId.txIndex
            assetAmountThresheld: { type: Schema.Types.Mixed }
        }
    },
    securityConfirmedInfoSchema: {
        name: "securityConfirmedInfo",
        schema: {
            chainType: { type: String, index: true },
            confirmBlockBegin: { type: Number }, // block height
            syncedBlockNo: { type: Number }
        }
    },
    mappingTokenPolicyIdSchema: {
        name: "mappingTokenPolicyIdConfig",
        schema: {
            checkTokenType: { type: Number, index: true }, // 1: non-NFT; 2: NFT
            policyIds: { type: Array },
        }
    },
    balancedCfg:{
        "utxoNumThresheld": {
            "maxUtxoListLen" : 30, 
            "idealUtxoListLen" : 20, 
            "minUtxoListLen" : 10 
        },
        "assetAmountThresheld":{
            "lovelace" : "1000000000", 
            "9772ff715b691c0444f333ba1db93b055c0864bec48fff92d1f2a7fe.446a65645f746573744d6963726f555344" : "1000000000" 
        }
    },
    chainSyncCfg:{
        "initialBlockNumber": 4363799,
        "initialBlockTime": "2026-01-26T14:49:23Z",
        "initialSlot": 113813368,
        "initialHash": "da0cfbb030d7fc5c2a7b8de3417ffbf8c7c855afeb25febc2897d79b3d09ba0a"
    },
    ogmiosServerCfg: {
        host: "", 
        port: '',
    },
    nftTreasuryScCfg: "addr_test1xqqw340d77klvhfk4gnzhfrxkkrxahrzmvf27q5sf2mm002wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2svzq03w", 
    treasuryScCfg: "addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp",
    checkTokenPolicyIdCfg: [
        "4295914ef5ff86204642d3334ee444f9dafc694b4da246b39b68fbb0",
        "2707ef39e2521117d2d3851ef80ad17737eb8294a58397948aa28568"
    ],
    nftCheckTokenPolicyIdCfg: [
        "dc03f74865208cc90733f4c2282073639e609f5845ee5517f87cfde1",
        "607374414c712fd6108e936f38a4edc60a75c8ce4b2cf1ff33ae4f15"
    ],
    tokenPolicyIdCfg: [
        "d2a8592ec9673ac18fea1044885f94518e954ab0cb2b6bb0a328d2af"
    ],
    msgTokenPolicyIdCfg: [
        "e8849a60d3d6bc314e0036e2363e0f59edfd505fd549fcf4ce0e5d85",
        "d4a3de9899bbfefee427e4749ce51225ca01b0a2d9bce2cd2ddf5e61"
    ],
    preGroupHolderAddress: [ 
        "addr_test1wz7kryjwpwra99m5nahmzfd5ygd4j2mtdhe5fp5jte9llhgk2a4fj",
        "addr_test1wqkyhmw5yaaa77tsxcatmgjgy74vsayn4h22nwzjzjlw4kc7zgwgx",
        "addr_test1wpm9vmfxjk0lcrcwzfx76zmcyxpfluux9cwppyu9639thycpks2wj"
    ],
    curGroupHolderAddress: "addr_test1wre7m2jwekekuvcmuc27mf7gwge7x3xmj0k2rsvjuqtq43cnhaprg",
    nftMetaHolderAddress: "addr_test1wr5lnah4hlgxg9uavc7eyk98tyc6uq8wqpp8vk4ng8p9eaqhuv9jf",
    feeReceiverAddress: "addr_test1qqhmy64hrjva3f4v7w3dwt8djc2frf39hvk9wprdz6uqvhs3r7u5m5rasa0xdrfkr7zf2dee79cyy7ugn6asl5xfy7sshfrg0z",
    leaderAddress: "addr_test1qr7rkhxz96s4jtcja55l3nhsxzceu6wmv3u4ttykhawy9xhu8dwvyt4ptyh39mfflr80qv93ne5akere2kkfd06ug2dq9y7rvt",
    iWanConfig:  {
        "retryInterval": 1800000,
        "serviceID": 60150,
        "nodeUrl": "https://nodes-testnet.wandevs.org/wan",
        "cardanoChainID": '2147485463'
    },
    configurationScDict: {
        address: '0x86704C09EE544cF5e3BA2f92E35d1f65f10F7014',
        abi: require("../ogmiosService/services/iWanService/abi/abi.ConfigurationDelegate.json"), 
        multicallAddr: "0xFe3359b5C97191c4E2543dC7aC675d8BD947dE57"
    },
    securityConfirmEnable: false,
    queryServiceDisable: false,
    indexApiCfg: {
        url: "",
        apiKey:""
    },
    cacheDataConfig: {
        "ChainTip": 1,
        "EraSummaries": 2,
        "ProtocolParams": 3,
        "GenesisConfig": 4,
        "EpochsParams": 5
    },
    cacheDataValidDuration: 30 * 60 * 1000,
    safeBlockCount: 30,
    chainSyncDelaySlot: 60,
    chainSyncInterval: 15 * 1000,
    batchScanCount: 5,
    dataSourceType: 3, // 1: ogmios; 2: indexApi; 3: blockfrost
    txMetaDataSource: 2, // 1: ogmios;  2: blockForst
    chainAddressPrefixConfig: [
        { chainType: 'MOVR', chainID: '1073741825', addressPrex: '0x' },
        { chainType: 'ARETH', chainID: '1073741826', addressPrex: '0x' },
        { chainType: 'ADAE', chainID: '1073741827', addressPrex: '0x' },
        { chainType: 'GLMR', chainID: '1073741828', addressPrex: '0x' },
        { chainType: 'METIS', chainID: '1073741834', addressPrex: '0x' },
        { chainType: 'OKB', chainID: '1073741835', addressPrex: '0x' },
        { chainType: 'SGB', chainID: '1073741836', addressPrex: '0x' },
        { chainType: 'ZKETH', chainID: '1073741837', addressPrex: '0x' },
        { chainType: 'BASEETH', chainID: '1073741841', addressPrex: '0x' },
        { chainType: 'LINEAETH', chainID: '1073741842', addressPrex: '0x' },
        { chainType: 'NOBLE', chainID: '1073741844', addressPrex: '' },
        { chainType: 'OPBNB', chainID: '1073741845', addressPrex: '0x' },
        { chainType: 'BLASTETH', chainID: '1073741846', addressPrex: '0x' },
        { chainType: 'DIONE', chainID: '1073741848', addressPrex: '0x' },
        { chainType: 'EDX', chainID: '1073741850', addressPrex: '0x' },
        { chainType: 'WATER', chainID: '1073741851', addressPrex: '0x' },
        { chainType: 'FTN', chainID: '1073741852', addressPrex: '0x' },
        { chainType: '5IRE', chainID: '1073741853', addressPrex: '0x' },
        { chainType: 'LRPO', chainID: '1073741854', addressPrex: '0x' },
        { chainType: 'IMX', chainID: '1073741855', addressPrex: '0x' },
        { chainType: 'SHIDO', chainID: '1073741856', addressPrex: '0x' },
        { chainType: 'WORLDETH', chainID: '1073741857', addressPrex: '0x' },
        { chainType: 'UNIETH', chainID: '1073741858', addressPrex: '0x' },
        { chainType: 'XPL', chainID: '1073741861', addressPrex: '0x' },
        { chainType: 'DUST', chainID: '1073741862', addressPrex: '' },
        { chainType: 'KATANAETH', chainID: '1073741863', addressPrex: '0x' },
        { chainType: 'BTC', chainID: '2147483648', addressPrex: '' },
        { chainType: 'LTC', chainID: '2147483650', addressPrex: '' },
        { chainType: 'DOGE', chainID: '2147483651', addressPrex: '' },
        { chainType: 'ETH', chainID: '2147483708', addressPrex: '0x' },
        { chainType: 'ATOM', chainID: '2147483766', addressPrex: '' },
        { chainType: 'XRP', chainID: '2147483792', addressPrex: '' },
        { chainType: 'EOS', chainID: '2147483842', addressPrex: '' },
        { chainType: 'TRX', chainID: '2147483843', addressPrex: '' },
        { chainType: 'ALGO', chainID: '2147483931', addressPrex: '' },
        { chainType: 'DOT', chainID: '2147484002', addressPrex: '' },
        { chainType: 'KAVA', chainID: '2147484107', addressPrex: '' },
        { chainType: 'SOL', chainID: '2147484149', addressPrex: '' },
        { chainType: 'XDC', chainID: '2147484198', addressPrex: '' },
        { chainType: 'OETH', chainID: '2147484262', addressPrex: '0x' },
        { chainType: 'BNB', chainID: '2147484362', addressPrex: '0x' },
        { chainType: 'SUI', chainID: '2147484432', addressPrex: '0x' },
        { chainType: 'ASTR', chainID: '2147484458', addressPrex: '0x' },
        { chainType: 'VET', chainID: '2147484466', addressPrex: '0x' },
        { chainType: 'MATIC', chainID: '2147484614', addressPrex: '0x' },
        { chainType: 'TLOS', chainID: '2147484625', addressPrex: '0x' },
        { chainType: 'FTM', chainID: '2147484655', addressPrex: '0x' },
        { chainType: 'ADA', chainID: '2147485463', addressPrex: '' },
        { chainType: 'AVAX', chainID: '2147492648', addressPrex: '0x' },
        { chainType: 'NRG', chainID: '2147493445', addressPrex: '0x' },
        { chainType: 'S', chainID: '2147493655', addressPrex: '0x' },
        { chainType: 'CELO', chainID: '2147536400', addressPrex: '0x' },
        { chainType: 'SEI', chainID: '2166483766', addressPrex: '0x' },
        { chainType: 'WAN', chainID: '2153201998', addressPrex: '0x' }
    ]
}
