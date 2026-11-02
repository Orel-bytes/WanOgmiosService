
module.exports = {
    OgmiosServer:"http://52.13.9.234:4337",
    OgmiosPids:[
        {"pid": 5978, "name":"node"},
        {"pid": 949, "name":"mongod"},
        {"pid": 27595, "name":"cardano-node"},
        {"pid": 27597, "name":"ogmios"}

    ],
    MpcNodeNum: 6,
    NodeAccessInterval: 5*1000,
    RecordInterval: 60*60*1000,
    PerformanceTitle: "WanOgmiosPerformanceTest",
    TopProcessNum: 20,
    StaticSleepTime: 60*1000
}
