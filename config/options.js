const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

module.exports = {
    network: "mainnet",
    mongo_url: "mongodb://127.0.0.1:27017/wanOgmiosService_maestroMainnet",
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
    balancedCfg: {
        "utxoNumThresheld": {
            "maxUtxoListLen": 30,
            "idealUtxoListLen": 20,
            "minUtxoListLen": 10
        },
        "assetAmountThresheld": {
            "lovelace": "1000000000"
        }
    },
    chainSyncCfg: {
        "initialBlockNumber": 9075760,
        "initialBlockTime": "2023-07-25T09:33:00Z",
        "initialSlot": 98747203,
        "initialHash": "84410f42ce8a6d2fbcd0d570a659266b915ffba11db749cf143626cd19c53df6"
    },
    ogmiosServerCfg: {
        host: "", 
        port: '',
    },
    ogmiosServerCfgList: [
        {
            host: "",
            port: '',
            tls: true
        },
        {
            host: "35.160.141.169",
            port: '1337',
            tls: false
        },
        // {
        //     host:  "100.23.23.254",
        //     port: '1337',
        //     tls: false
        // },
        // {
        //     host:  "35.163.129.90", 
        //     port: '1337',
        //     tls: false
        // }
    ],
    nftTreasuryScCfg: "addr1xy2pp2jvxj5r3yh5xvet4lgyllkx2306s3pgaqrhylela039nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsgaycvj",
    treasuryScCfg: "addr1xyw0kswupwx38ljnvq8pwpvae0x69krywdr7cffg3d84ydp9nvv84g58ykxqh90xx6j8ywgjst0dkt430w9lxgdmzncsw5rzpd",
    checkTokenPolicyIdCfg: [
        "526d246045bf4a66ae86fd7a9985a91ef3752113f9daa9060bb54be6",
        "992eefaec3fed37e3cdd4e9063721f0f2e231d61934a9f538b492f5c"
    ],
    nftCheckTokenPolicyIdCfg: [
        "1a9ede8ae3fc26024363cf262a832ba82387001008abea0650dc199e",
        "b1e25b8b6b873e68dc6f6ebbb967dfff2da227d18af7ed5391587cad"
    ],
    tokenPolicyIdCfg: [
        "25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff935"
    ],
    msgTokenPolicyIdCfg: [
    ],
    preGroupHolderAddress: [
        "addr1w9swcyfjusdj0w22dxm8nfnsg8ytd63svslszvxdfuyt6uc38zn0x"
    ],
    curGroupHolderAddress: "addr1w85m45w85tkf6dpqr35wx87lp8wd365av3nwqrrmcr4kgzcs3kph7",
    nftMetaHolderAddress: "addr1wx5qwgfp9jnf3gnf88fj9c9hzh0ldnvq3wwcxc58dlpnrqcaturde",
    feeReceiverAddress: "addr1qyxqtjnck8f0gyzys6kwpydd5lrcjue6tg8f2elqhs65ffy7trczz375trxwfgc7zvkvxrxcr4plz8tnqv6qre7u722qhe650r",
    leaderAddress: "addr1qy6vf7reda8mmesz3h2s07mklaa0lflsagtaeheclnr4awp5cnu8jm60hhnq9rw4qlahdlm6l7nlp6shmn0n3lx8t6uqmj0szw",
    iWanConfig: {
        "dataValidLatestTs": 1800000,
        "iWanServiceID": 60150,
        "nodeUrl": "https://nodes.wandevs.org/wan",
        "cardanoChainID": '2147485463'
    },
    configurationScDict: {
        address: '0x6Dc2fC72584BfFa35Cc6D521a22081dD0217f3b6',
        abi: require("../ogmiosService/services/iWanService/abi/abi.ConfigurationDelegate.json"),
        multicallAddr: "0x0575344f57a655f9a76f9546d8b53cdecf94eec9"
    },
    securityConfirmEnable: false,
    queryServiceDisable: false,
    indexApiCfg: {
        url: "https://mainnet.gomaestro-api.org/v1",
        apiKey: "RCdVvIrl3cfyLXprkX17CYTCU9heZBUY"
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
        { chainType: 'GLMR', chainID: '1073741828', addressPrex: '0x' },
        { chainType: 'METIS', chainID: '1073741834', addressPrex: '0x' },
        { chainType: 'OKB', chainID: '1073741835', addressPrex: '0x' },
        { chainType: 'SGB', chainID: '1073741836', addressPrex: '0x' },
        { chainType: 'ZKETH', chainID: '1073741837', addressPrex: '0x' },
        { chainType: 'MATICETH', chainID: '1073741838', addressPrex: '0x' },
        { chainType: 'VC', chainID: '1073741840', addressPrex: '0x' },
        { chainType: 'BASEETH', chainID: '1073741841', addressPrex: '0x' },
        { chainType: 'LINEAETH', chainID: '1073741842', addressPrex: '0x' },
        { chainType: 'NOBLE', chainID: '1073741844', addressPrex: '' },
        { chainType: 'OPBNB', chainID: '1073741845', addressPrex: '0x' },
        { chainType: 'BLASTETH', chainID: '1073741846', addressPrex: '0x' },
        { chainType: 'DIONE', chainID: '1073741848', addressPrex: '0x' },
        { chainType: 'EDX', chainID: '1073741850', addressPrex: '0x' },
        { chainType: 'WATER', chainID: '1073741851', addressPrex: '0x' },
        { chainType: 'SHIDO', chainID: '1073741856', addressPrex: '0x' },
        { chainType: 'WORLDETH', chainID: '1073741857', addressPrex: '0x' },
        { chainType: 'UNIETH', chainID: '1073741858', addressPrex: '0x' },
        { chainType: 'XPL', chainID: '1073741861', addressPrex: '0x' },
        { chainType: 'BTC', chainID: '2147483648', addressPrex: '' },
        { chainType: 'LTC', chainID: '2147483650', addressPrex: '' },
        { chainType: 'DOGE', chainID: '2147483651', addressPrex: '' },
        { chainType: 'ETH', chainID: '2147483708', addressPrex: '0x' },
        { chainType: 'XRP', chainID: '2147483792', addressPrex: '' },
        { chainType: 'EOS', chainID: '2147483842', addressPrex: '' },
        { chainType: 'TRX', chainID: '2147483843', addressPrex: '' },
        { chainType: 'ALGO', chainID: '2147483931', addressPrex: '' },
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
        { chainType: 'WAN', chainID: '2153201998', addressPrex: '0x' },
        { chainType: 'SEI', chainID: '2166483766', addressPrex: '0x' }
    ]
}
