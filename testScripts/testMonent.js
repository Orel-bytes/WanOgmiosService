
const CBOR = require('cbor')

let beginBlock = {
    // height: 1989630,
    // slot: 9826770,
    // date: "2020/11/01 01:59:46"
    height: 1989631,
    slot: 9826800,
    date: "2020/11/01 02:00:16"
}

let targetBlock = {
    // height: 1989631,
    // slot: 9826800,
    // date: "2020/11/01 02:00:16"
    height: 3192564,
    slot: 46392464,
    date: "2021/12/29 07:08:00"
}


let GenesisBlockSlot = beginBlock.slot; 
let strAdaGenesisBlockTime = beginBlock.date;
let adaGenesisBlockTimeStamp = new Date(strAdaGenesisBlockTime).getTime()/1000;
console.log("adaGenesisBlockTimeStamp:", adaGenesisBlockTimeStamp);


let targetBlockSlot = targetBlock.slot; 
let deltaTime = (targetBlockSlot - GenesisBlockSlot);
console.log("deltaTime:", deltaTime);
let targetBlockTimeStamp = adaGenesisBlockTimeStamp + deltaTime;
console.log("targetBlockTimeStamp:", targetBlockTimeStamp);


let strTargetBlockTime = targetBlock.date;
let adaTargetBlockTimeStamp = new Date(strTargetBlockTime).getTime();
console.log("adaTargetBlockTimeStamp:", adaTargetBlockTimeStamp/1000);



