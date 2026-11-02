async function LazyLoadESModule(moduleName) {
  return await import(moduleName);
}

async function getMidnightNetworkId() {
    // for preview
    return global.testnet ? 'preview' : 'mainnet';
}
async function lazyLoadMidnightCrosschainModule() {
    if (!global.ModuleMidnightCrosschain) {
      global.ModuleMidnightCrosschain = await LazyLoadESModule('midnight-crosschain-light');
      global.ModuleMidnightCrosschain.initNetwork(await getMidnightNetworkId());
    }
    return global.ModuleMidnightCrosschain;
}

const Midnight = {
    lazyLoadMidnightCrosschainModule,
    getMidnightNetworkId
}


exports.Midnight = Midnight;