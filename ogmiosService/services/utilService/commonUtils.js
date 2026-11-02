
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const BigNumber = require('bignumber.js');
const blake = require('blakejs');
const cbor = require('cbor');
const regexp = /\x00/; // eslint-disable-line no-control-regex
const ignoreKeys = new Set(['$db', '$ref', '$id', '$clusterTime']);


function encodeUtxo(utxoObj) {
	let txInData = utxoObj.txIn;
	let txOutData = utxoObj.txOut;

	let transaction_id = CardanoWasm.TransactionHash.from_bytes(Buffer.from(txInData.txId, 'hex'));
	let txInput = CardanoWasm.TransactionInput.new(transaction_id, txInData.index);
	let address = CardanoWasm.Address.from_bech32(txOutData.address);

	let amount = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(this.number2String(txOutData.value[0].quantity)));
	if (1 < txOutData.value.length) {
		let multiAssetObj = CardanoWasm.MultiAsset.new();
		for (let i = 1; i < txOutData.value.length; i++) {

			let strScriptHash = txOutData.value[i].unit.slice(0, 56);
			let strName = txOutData.value[i].unit.slice(56);

			let tokenAsset = this.buildTokenAsset(strName, txOutData.value[i].quantity);
			let tokenSriptHash = CardanoWasm.ScriptHash.from_bytes(Buffer.from(strScriptHash, "hex"));
			multiAssetObj.insert(tokenSriptHash, tokenAsset);
		}
		amount.set_multiasset(multiAssetObj);
	}

	let txOutput = CardanoWasm.TransactionOutput.new(address, amount);
	let strUtxoId = CardanoWasm.TransactionUnspentOutput.new(txInput, txOutput).to_bytes().toString();

	return strUtxoId;
}

function convertMaestroEraSummariesInfo(maestroEraSummariesInfo) {

	let eraSummariesInfo = new Array();
	let preEraEndTime = undefined;

	for (let i = 0; i < maestroEraSummariesInfo.length; i++) {
		let maestroEraItem = maestroEraSummariesInfo[i];
		// console.log("\n\n...Era startTime: ", maestroEraItem.start.time);
		// console.log("...Era endTime: ", maestroEraItem.end.time);

		let eraSummariesItem = {};
		eraSummariesItem.start = {
			time: (undefined === preEraEndTime) ? maestroEraItem.start.time.seconds : preEraEndTime,
			slot: maestroEraItem.start.slot,
			epoch: maestroEraItem.start.epoch
		};

		let curEraSlotSecond = maestroEraItem.parameters.slotLength.milliseconds / 1000;
		let extraSlot = maestroEraItem.end.slot - maestroEraItem.start.slot;
		let extraTime = extraSlot * curEraSlotSecond;
		preEraEndTime = eraSummariesItem.start.time + extraTime;

		eraSummariesItem.end = {
			time: preEraEndTime,
			slot: maestroEraItem.end.slot,
			epoch: maestroEraItem.end.epoch
		};
		eraSummariesItem.parameters = {
			epochLength: maestroEraItem.parameters.epochLength,
			slotLength: curEraSlotSecond,
			safeZone: maestroEraItem.parameters.safeZone
		};

		eraSummariesInfo.push(eraSummariesItem);
	}

	return eraSummariesInfo;
}

function convertMaestroProtocolParams(maestroProtocolParams) {

	let protocolParameters = {};

	protocolParameters.minFeeCoefficient = maestroProtocolParams.minFeeCoefficient;
	let bnMinFeeConstant = new BigNumber(maestroProtocolParams.minFeeConstant.ada.lovelace);
	protocolParameters.minFeeConstant = bnMinFeeConstant.toNumber();
	protocolParameters.maxBlockBodySize = maestroProtocolParams.maxBlockBodySize.bytes;
	protocolParameters.maxBlockHeaderSize = maestroProtocolParams.maxBlockHeaderSize.bytes;
	protocolParameters.maxTxSize = maestroProtocolParams.maxTransactionSize.bytes;
	let bnStakeKeyDeposit = new BigNumber(maestroProtocolParams.stakeCredentialDeposit.ada.lovelace);
	protocolParameters.stakeKeyDeposit = bnStakeKeyDeposit.toNumber();
	let bnPoolDeposit = new BigNumber(maestroProtocolParams.stakePoolDeposit.ada.lovelace);
	protocolParameters.poolDeposit = bnPoolDeposit.toNumber();
	protocolParameters.poolRetirementEpochBound = maestroProtocolParams.stakePoolRetirementEpochBound;
	protocolParameters.desiredNumberOfPools = maestroProtocolParams.desiredNumberOfStakePools;
	protocolParameters.poolInfluence = maestroProtocolParams.stakePoolPledgeInfluence;
	protocolParameters.monetaryExpansion = maestroProtocolParams.monetaryExpansion;
	protocolParameters.treasuryExpansion = maestroProtocolParams.treasuryExpansion;
	protocolParameters.protocolVersion = maestroProtocolParams.version;
	let bnMinPoolCost = new BigNumber(maestroProtocolParams.minStakePoolCost.ada.lovelace);
	protocolParameters.minPoolCost = bnMinPoolCost.toNumber();
	protocolParameters.coinsPerUtxoByte = maestroProtocolParams.minUtxoDepositCoefficient;
	protocolParameters.prices = {
		memory: maestroProtocolParams.scriptExecutionPrices.memory,
		steps: maestroProtocolParams.scriptExecutionPrices.cpu
	},
		protocolParameters.maxExecutionUnitsPerTransaction = {
			memory: maestroProtocolParams.maxExecutionUnitsPerTransaction.memory,
			steps: maestroProtocolParams.maxExecutionUnitsPerTransaction.cpu
		},
		protocolParameters.maxExecutionUnitsPerBlock = {
			memory: maestroProtocolParams.maxExecutionUnitsPerBlock.memory,
			steps: maestroProtocolParams.maxExecutionUnitsPerBlock.cpu
		},
		protocolParameters.maxValueSize = maestroProtocolParams.maxValueSize.bytes;
	protocolParameters.collateralPercentage = maestroProtocolParams.collateralPercentage;
	protocolParameters.maxCollateralInputs = maestroProtocolParams.maxCollateralInputs;

	let minFeeReferenceScripts = maestroProtocolParams.minFeeReferenceScripts;
	let range = new BigNumber(minFeeReferenceScripts.range);
	protocolParameters.range = range.toNumber();
	protocolParameters.minFeeRefScriptCostPerByte = minFeeReferenceScripts.base;
	protocolParameters.base = minFeeReferenceScripts.base;
	protocolParameters.multiplier = minFeeReferenceScripts.multiplier;

	protocolParameters.plutusCostModels = maestroProtocolParams.plutusCostModels;

	return protocolParameters;
}

function convertMaestroGenesisConfig(maestroGenesisConfig) {

	let genesisConfig = {};
	genesisConfig.systemStart = maestroGenesisConfig.startTime;//  '2017-09-23T21:44:51Z',
	genesisConfig.networkMagic = maestroGenesisConfig.networkMagic;// 764824073,
	genesisConfig.network = maestroGenesisConfig.network;//'mainnet',
	genesisConfig.activeSlotsCoefficient = maestroGenesisConfig.activeSlotsCoefficient;// '1/20',
	genesisConfig.securityParameter = maestroGenesisConfig.securityParameter;// 2160,
	genesisConfig.epochLength = maestroGenesisConfig.epochLength;// 432000,
	genesisConfig.slotsPerKesPeriod = maestroGenesisConfig.slotsPerKesPeriod;// 129600,
	genesisConfig.maxKesEvolutions = maestroGenesisConfig.maxKesEvolutions;// 62,
	genesisConfig.slotLength = maestroGenesisConfig.slotLength.milliseconds / 1000; //1,
	genesisConfig.updateQuorum = maestroGenesisConfig.updateQuorum;// 5,
	genesisConfig.maxLovelaceSupply = new BigNumber(maestroGenesisConfig.maxLovelaceSupply).toNumber;// 45000000000000000n,

	let initialParameters = maestroGenesisConfig.initialParameters;
	genesisConfig.protocolParameters = {
		minFeeCoefficient: initialParameters.minFeeCoefficient,//44,
		minFeeConstant: new BigNumber(initialParameters.minFeeConstant.ada.lovelace).toNumber(), //.155381,
		maxBlockBodySize: initialParameters.maxBlockBodySize.bytes,//65536,
		maxBlockHeaderSize: initialParameters.maxBlockHeaderSize.bytes, //1100,
		maxTxSize: initialParameters.maxTransactionSize.bytes,//16384,
		stakeKeyDeposit: new BigNumber(initialParameters.stakeCredentialDeposit.ada.lovelace).toNumber(), //2000000,
		poolDeposit: new BigNumber(initialParameters.stakePoolDeposit.ada.lovelace).toNumber(),//500000000,
		poolRetirementEpochBound: initialParameters.stakePoolRetirementEpochBound,//18,
		desiredNumberOfPools: initialParameters.desiredNumberOfStakePools,//150,
		poolInfluence: initialParameters.stakePoolPledgeInfluence,//'3/10',
		monetaryExpansion: initialParameters.monetaryExpansion, //'3/1000',
		treasuryExpansion: initialParameters.treasuryExpansion,//'1/5',
		decentralizationParameter: initialParameters.federatedBlockProductionRatio,//'1/1',
		extraEntropy: initialParameters.extraEntropy, //'neutral',
		protocolVersion: initialParameters.version,//{ major: 2, minor: 0 },
		minUtxoValue: new BigNumber(initialParameters.minUtxoDepositConstant.ada.lovelace).toNumber(),// 1000000,
		minPoolCost: new BigNumber(initialParameters.minStakePoolCost.ada.lovelace).toNumber(),//340000000
	}

	return genesisConfig;
}

function convertMaestroRedeemers(redeemers) {
	if (undefined === redeemers) {
		return undefined;
	}

	let formatedRedeemers = {};
	for (let i = 0; i < redeemers.length; i++) {

		let validator = redeemers[i].validator;
		let redeemerKey = validator.purpose + ":" + validator.index;

		let redeemerObj = {
			"redeemer": redeemers[i].redeemer,
			"executionUnits": {
				"memory": redeemers[i].executionUnits.memory,
				"steps": redeemers[i].executionUnits.cpu
			}
		}

		formatedRedeemers[redeemerKey] = redeemerObj;
	}

	console.log("formated Redeemers Info: ", formatedRedeemers);
	return formatedRedeemers;
}

function convertMaestroEvaluateRet(evaluateRet) {
	if (undefined === evaluateRet) {
		return undefined;
	}

	let formatedRet = {};
	for (let i = 0; i < evaluateRet.length; i++) {
		// console.log("convertMaestroRedeemers: ",evaluateRet[i]);
		let validator = evaluateRet[i].validator;
		let redeemerKey = validator.purpose + ":" + validator.index;

		let redeemerObj = {
			"memory": evaluateRet[i].budget.memory,
			"steps": evaluateRet[i].budget.cpu,
			"cpu": evaluateRet[i].budget.cpu
		}
		formatedRet[redeemerKey] = redeemerObj;
	}

	console.log("formated EvaluateRet Info: ", formatedRet);
	return formatedRet;
}

function convertMaestroEvaluateRet4PlutusSdk(evaluateRet) {
	if (undefined === evaluateRet) {
		return undefined;
	}

	let formatedRet = {};
	for (let i = 0; i < evaluateRet.length; i++) {
		// console.log("convertMaestroRedeemers: ",evaluateRet[i]);
		let validator = evaluateRet[i].validator;
		let redeemerKey = validator.purpose + ":" + validator.index;

		let redeemerObj = {
			"memory": evaluateRet[i].budget.memory,
			"steps": evaluateRet[i].budget.cpu,
			"cpu": evaluateRet[i].budget.cpu
		}
		formatedRet[redeemerKey] = redeemerObj;
	}

	console.log("formated EvaluateRet Info: ", formatedRet);
	return formatedRet;
}

function convertMaestroUtxoScriptInfo(script) {
	if (undefined === script) {
		return undefined;
	}

	let formatedScript = {};
	if ("native" === script.language) {
		formatedScript[script.language] = script.json;

	} else {

		let strType = "";
		if (script.language.includes(':')) {
			strType = script.language.toLowerCase();
		} else {
			strType = script.language.replace("plutus", "plutus:").toLowerCase();
		}

		formatedScript[strType] = script.cbor;
	}

	return formatedScript;
}

function convertMaestroUtxoAmount(utxoValueObj) {
	console.log("..convertMaestroUtxoAmount: ", utxoValueObj);
	if (undefined === utxoValueObj) {
		return undefined;
	}

	let assetsAmountArray = new Array();

	for (let key in utxoValueObj) {
		let policyTokens = utxoValueObj[key];
		console.log("..convertMaestroUtxoAmount: ", key, policyTokens);

		if ("ada" === key) {
			let adaAmountObj = {
				"unit": "lovelace",
				"quantity": policyTokens["lovelace"].toString()
			}
			assetsAmountArray.push(adaAmountObj);
			console.log("..add asset: ", adaAmountObj);

		} else {
			let policyId = key;

			for (let name in policyTokens) {
				let tokenName = policyId + "." + name;
				let tokenAmount = policyTokens[name];
				console.log("token unit: ", tokenName);
				console.log("token amunt: ", tokenAmount.toString());

				let tokenAmountObj = {
					"unit": tokenName,
					"quantity": tokenAmount.toString()
				}
				assetsAmountArray.push(tokenAmountObj);
				console.log("..add asset: ", tokenAmountObj);
			}
		}
	}
	console.log("\n\n .....assetsAmountArray: ", assetsAmountArray, assetsAmountArray.length);

	return assetsAmountArray;
}

function decodeMaestroMetaData(metadata) {
	let typeMetaData = Object.getPrototypeOf(metadata);
	console.log("...decodeMaestroMetaData...: ", typeMetaData);

	if ("object" === typeof (metadata)) {

		if (metadata instanceof Array) {
			console.log("...decodeMaestroMetaData...case array: ", metadata);
			let retObject = [];
			for (let i = 0; i < metadata.length; i++) {
				const elem = decodeMaestroMetaData(metadata[i]);
				retObject.push(elem);
			}
			console.log("decodeMaestroMetaData array: ", retObject);
			return retObject;

		} else {
			console.log("...decodeMaestroMetaData...case object: ", metadata);
			let retObject = {};
			for (let key in metadata) {
				let objItem = metadata[key];
				console.log("...decodeMaestroMetaData...object item: ", key, objItem);

				const value = decodeMaestroMetaData(objItem);
				console.log("decodeMaestroMetaData object: ", key, value);
				retObject[key] = value;
			}
			return retObject;
		}

	} else if ("bigint" === typeof (metadata)) {
		console.log("...decodeMaestroMetaData...case bigint: ", metadata);
		let retObject = new BigNumber(metadata).toNumber();

		return retObject;

	} else if ("string" === typeof (metadata)) {
		console.log("...decodeMaestroMetaData...case string: ", metadata);
		console.log("\n string metadata: ", metadata);

		let invalidString = "\u0000";
		if (-1 !== metadata.indexOf(invalidString)) {
			let retObject = metadata.replace(invalidString, "");
			return retObject;
		}
		return metadata;

	} else if ("bytes" === typeof (metadata)) {
		console.log("...decodeMaestroMetaData...case bytes: ", metadata);
		let retObject = "0x" + metadata;
		return retObject;
	}

	return execption;
}

function decodeMetadata2Json(metadata) {

	console.log("...decodeMetadata2Json...: ", typeof (metadata));
	// we must check the type first to know how to handle it
	for (let key in metadata) {
		console.log("...decodeMetadata2Json...metadata: ", key, metadata[key]);

		if ("map" === key) {
			const mapRet = {};
			const mapData = metadata[key];
			for (let i = 0; i < mapData.length; i++) {
				let mapItem = mapData[i];
				const key = decodeMetadata2Json(mapItem["k"]);
				const value = decodeMetadata2Json(mapItem["v"]);
				console.log("decodeMetadata2Json map: ", key, value);
				mapRet[key] = value;
			}
			return mapRet;
		} else if ("list" === key) {
			let arrRet = [];
			const arr = metadata[key];
			for (var i = 0; i < arr.length; i++) {
				const elem = decodeMetadata2Json(arr[i]);
				arrRet.push(elem);
			}
			console.log("decodeMetadata2Json list: ", arrRet);
			return arrRet;
		} else if ("int" === key) {
			console.log("decodeMetadata2Json int: ", metadata[key]);


			let strValue = metadata[key];
			console.log("type : ", typeof strValue);
			// if (typeof strValue !== 'string') {
			// 	strValue = metadata[key].toString();
			// }
			// let bInt = CardanoWasm.BigNum.from_str(strValue);

			// let iValue = undefined;
			// if(0 > parseInt(metadata[key])){
			// 	iValue = CardanoWasm.Int.new_negative(bInt);
			// }else{
			// 	iValue = CardanoWasm.Int.new(bInt);
			// }

			// let item = CardanoWasm.TransactionMetadatum.new_int(iValue);
			// let decodedItem = CardanoWasm.decode_metadatum_to_json_str(item);
			// console.log("decoded int: ", decodedItem);
			return parseInt(metadata[key]);

		} else if ("bytes" === key) {
			console.log("decodeMetadata2Json bytes: ", metadata[key]);
			// let item = CardanoWasm.TransactionMetadatum.new_bytes(metadata[key]);
			// let decodedItem = CardanoWasm.decode_metadatum_to_json_str(item);
			// console.log("decoded bytes: ", decodedItem);
			return "0x" + metadata[key];
		} else if ("string" === key) {
			console.log("decodeMetadata2Json text: ", metadata[key]);

			let invalidString = "\u0000";
			if (-1 !== metadata[key].indexOf(invalidString)) {
				let subStr = metadata[key].replace(invalidString, "");
				console.log("decodeMetadata2Json replaced text: ", subStr);

				return subStr;
			}
			// let item = CardanoWasm.TransactionMetadatum.new_text(metadata[key]);
			// let decodedItem = CardanoWasm.decode_metadatum_to_json_str(item);
			// console.log("decoded text: ", decodedItem);
			return metadata[key];
			// }else if("json" === key){

			// 	let subMetadata = metadata[key];
			// 	let metaDataArray = new Array();
			// 	for (let key in subMetadata) {
			// 		console.log("...meta item...: ", key, subMetadata[key]);
			// 		let jsonMetaData = decodeMetadata2Json(subMetadata[key]); //parseMetadata
			// 		let metaDataInfo = {
			// 		  "label": key,
			// 		  "json_metadata": jsonMetaData
			// 		}
			// 		metaDataArray.push(metaDataInfo);
			// 	}
			// 	metadata[key] = metaDataArray;
			// 	return metadata[key]; // json
		} else {
			if ("tokenPairID" === key) {
				console.log("decodeMetadata2Json tokenPairID: ", metadata[key]);
				let bnTokenPairId = new BigNumber(metadata[key]);
				metadata.tokenPairID = bnTokenPairId.toNumber();
			} else if ("type" === key) {
				console.log("decodeMetadata2Json type: ", metadata[key]);
				let bnType = new BigNumber(metadata[key]);
				metadata.type = bnType.toNumber();
			}
		}

	}

	return metadata;
}

function parseMetadata(metadata) {
	// CardanoWasm.TransactionMetadatum
	// we must check the type first to know how to handle it
	for (let key in metadata) {

		if ("map" === key) {
			const mapRet = {};
			const mapData = metadata[key];
			for (let i = 0; i < mapData.length; i++) {
				let mapItem = mapData[i];
				const key = parseMetadata(mapItem["k"]);
				const value = parseMetadata(mapItem["v"]);
				console.log("parseMetadata map: ", key, value);
				if (typeof key === 'string' && !ignoreKeys.has(key)) {
					if (key.match(regexp) != null) {
						continue;
					}
				}
				mapRet[key] = value;
			}
			return mapRet;
		} else if ("list" === key) {
			let arrRet = [];
			const arr = metadata[key];
			for (var i = 0; i < arr.length; i++) {
				const elem = parseMetadata(arr[i]);
				arrRet.push(elem);
			}
			console.log("parseMetadata list: ", arrRet);
			return arrRet;
		} else if ("int" === key) {
			let strValue = metadata[key];
			if (0 > parseInt(metadata[key])) {
				if (typeof strValue !== 'String') {
					strValue = metadata[key].toString();
				}
				return strValue;
			}

			if (typeof strValue !== 'String') {
				strValue = metadata[key].toString();
			}
			let bigValue = CardanoWasm.BigNum.from_str(strValue);
			console.log("parseMetadata int: ", bigValue.to_str());
			return bigValue.to_str();

		} else if ("bytes" === key) {
			return metadata[key];
		} else if ("string" === key) {

			let exceptionStr = "%";
			if (-1 !== metadata[key].indexOf(exceptionStr)) {
				console.log("decodeMetadata2Json uncommon value: ", metadata[key]);
				let subStr = "";
				console.log("decodeMetadata2Json replaced text: ", subStr);
				return subStr;
			}

			let invalidString = "\u0000";
			if (-1 !== metadata[key].indexOf(invalidString)) {
				let subStr = metadata[key].replace(invalidString, "");
				console.log("decodeMetadata2Json replaced text: ", subStr);

				return subStr;
			}
			console.log("parseMetadata text: ", metadata[key]);
			return metadata[key];
		}

	}

	return metadata;
}

function sleep(time) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve();
		}, time);
	})
}

function convertIndexApiUtxoToMaestro(obj) {

	let value = {};
	for (let idx = 0; idx < obj.assets.length; ++idx) {
		let asset = obj.assets[idx];
		if (asset.unit === "lovelace") {
			value["ada"] = {
				"lovelace": asset.amount
			}
		}
		else {
			let unit = asset.unit.substring(0, 56);
			let name = asset.unit.substring(56);
			if (undefined === value[unit]) {
				value[unit] = {};
			}
			value[unit][name] = asset.amount;
		}
	}

	let itemScript = null;
	console.log("\n\n..convertIndexApiUtxoToMaestro...reference_script:", obj.reference_script);
	if (obj.reference_script) {
		itemScript = {
			"language": obj.reference_script.type,
			"cbor": obj.reference_script.bytes,
			"json": obj.reference_script.json,
			"hash": obj.reference_script.hash
		}
	}

	let newObj = {
		transaction: {
			id: obj.tx_hash
		},
		index: obj.index,
		address: obj.address,
		value: value,
		datum: obj.datum ? obj.datum.bytes : undefined,
		datumHash: obj.datum ? obj.datum.hash : undefined,
		script: obj.reference_script ? itemScript : undefined
	}

	console.log("\n\n..convertIndexApiUtxoToMaestro...ret:", obj);
	return newObj;
}


function formatChainTipFromIndexApi(obj) {
	let chainTip = {
		"slot": obj.slot,
		"id": obj.block_hash,
		"hash": obj.block_hash
	};

	return chainTip;
}

function formatEraSummariesFromIndexApi(raw) {
	let preEraEndTime = undefined;
	return raw.map(v => {
		let item = {};
		item.start = {
			time: (undefined === preEraEndTime) ? v.start.time.seconds : preEraEndTime,
			slot: v.start.slot,
			epoch: v.start.epoch
		};

		let curEraSlotSecond = v.parameters.slot_length.milliseconds / 1000;
		let extraSlot = v.end.slot - v.start.slot;
		let extraTime = extraSlot * curEraSlotSecond;
		preEraEndTime = item.start.time + extraTime;

		item.end = {
			time: preEraEndTime,
			slot: v.end.slot,
			epoch: v.end.epoch
		};

		item.parameters = {
			epochLength: v.parameters.epoch_length,
			slotLength: curEraSlotSecond,
			safeZone: v.parameters.safe_zone
		};
		return item;
	})
}

function convertRedeemers2Ogmios(redeemers) {
	if (!redeemers) {
		return undefined;
	}

	let formatedRedeemers = {};
	let spends = redeemers.spends;
	for (let i = 0; i < spends.length; i++) {
		let spend = spends[i];
		let redeemerKey = "spend:" + spend.input_index;

		let redeemerObj = {
			"redeemer": spend.data.bytes,
			"executionUnits": {
				"memory": spend.ex_units[0],
				"steps": spend.ex_units[1]
			}
		}

		formatedRedeemers[redeemerKey] = redeemerObj;
	}

	for (let idx = 0; idx < redeemers.mints.length; ++idx) {
		let mint = redeemers.mints[idx];
		let redeemerKey = "mint:" + idx;

		let redeemerObj = {
			redeemer: mint.data.bytes,
			executionUnits: {
				memory: mint.ex_units[0],
				steps: mint.ex_units[1]
			}
		}
		formatedRedeemers[redeemerKey] = redeemerObj;
	}

	return formatedRedeemers;
}

function formatProtocolParamsFromIndexApi(raw) {
	let params = {};
	params.minFeeCoefficient = raw.min_fee_coefficient;
	let bnMinFeeConstant = new BigNumber(raw.min_fee_constant.ada.lovelace);
	params.minFeeConstant = bnMinFeeConstant.toNumber();
	params.maxBlockBodySize = raw.max_block_body_size.bytes;
	params.maxBlockHeaderSize = raw.max_block_header_size.bytes;
	params.maxTxSize = raw.max_transaction_size.bytes;
	let bnStakeKeyDeposit = new BigNumber(raw.stake_credential_deposit.ada.lovelace);
	params.stakeKeyDeposit = bnStakeKeyDeposit.toNumber();
	let bnPoolDeposit = new BigNumber(raw.stake_pool_deposit.ada.lovelace);
	params.poolDeposit = bnPoolDeposit.toNumber();
	params.poolRetirementEpochBound = raw.stake_pool_retirement_epoch_bound;
	params.desiredNumberOfPools = raw.desired_number_of_stake_pools;
	params.poolInfluence = raw.stake_pool_pledge_influence;
	params.monetaryExpansion = raw.monetary_expansion;
	params.treasuryExpansion = raw.treasury_expansion;
	params.protocolVersion = raw.version;
	let bnMinPoolCost = new BigNumber(raw.min_stake_pool_cost.ada.lovelace);
	params.minPoolCost = bnMinPoolCost.toNumber();
	params.coinsPerUtxoByte = raw.min_utxo_deposit_coefficient;
	params.prices = {
		memory: raw.script_execution_prices.memory,
		steps: raw.script_execution_prices.cpu
	},
		params.maxExecutionUnitsPerTransaction = {
			memory: raw.max_execution_units_per_transaction.memory,
			steps: raw.max_execution_units_per_transaction.cpu
		},
		params.maxExecutionUnitsPerBlock = {
			memory: raw.max_execution_units_per_block.memory,
			steps: raw.max_execution_units_per_block.cpu
		},
		params.maxValueSize = raw.max_value_size.bytes;
	params.collateralPercentage = raw.collateral_percentage;
	params.maxCollateralInputs = raw.max_collateral_inputs;

	let minFeeReferenceScripts = raw.min_fee_reference_scripts;
	let range = new BigNumber(minFeeReferenceScripts.range);
	params.range = range.toNumber();
	params.minFeeRefScriptCostPerByte = minFeeReferenceScripts.base;
	params.base = minFeeReferenceScripts.base;
	params.multiplier = minFeeReferenceScripts.multiplier;

	params.plutusCostModels = {
		"plutus:v1": raw.plutus_cost_models.plutus_v1,
		"plutus:v2": raw.plutus_cost_models.plutus_v2,
		"plutus:v3": raw.plutus_cost_models.plutus_v3
	};

	return params;
}

const GenesisConfig = {
	mainnet: {
		systemStart: '2017-09-23T21:44:51Z',
		networkMagic: 764824073,
		network: 'mainnet',
	},
	testnet: {
		systemStart: '2022-06-01T00:00:00Z',
		networkMagic: 1,
		network: 'testnet',
	},
	common: {
		activeSlotsCoefficient: '1/20',
		securityParameter: 2160,
		epochLength: 432000,
		slotsPerKesPeriod: 129600,
		maxKesEvolutions: 62,
		slotLength: 1,
		updateQuorum: 5,
		maxLovelaceSupply: undefined,
		protocolParameters: {
			minFeeCoefficient: 44,
			minFeeConstant: 155381,
			maxBlockBodySize: 65536,
			maxBlockHeaderSize: 1100,
			maxTxSize: 16384,
			stakeKeyDeposit: 2000000,
			poolDeposit: 500000000,
			poolRetirementEpochBound: 18,
			desiredNumberOfPools: 150,
			poolInfluence: '3/10',
			monetaryExpansion: '3/1000',
			treasuryExpansion: '1/5',
			decentralizationParameter: '1/1',
			extraEntropy: 'neutral',
			protocolVersion: { major: 2, minor: 0 },
			minUtxoValue: 1000000,
			minPoolCost: 340000000
		}
	}
};

function decodeCborMetaData(cborMetaData) {
	let bufferMetaData = Buffer.from(cborMetaData, "hex");
	let txMetaData = CardanoWasm.TransactionMetadatum.from_bytes(bufferMetaData); //.from_hex
	let metaData = CardanoWasm.decode_metadatum_to_json_str(txMetaData, CardanoWasm.MetadataJsonSchema.BasicConversions);

	let ret = JSON.parse(metaData);
	return ret;
}

function toSafeString(value) {
	if (BigNumber.BigNumber.isBigNumber(value)) {
		return value.toString();
	}

	return String(value);
}


function convertBlockForstUtxoAmount(amount) {
	if (undefined === amount) {
		return undefined;
	}

	for (let i = 0; i < amount.length; i++) {
		let unit = amount[i].unit;
		if ("lovelace" === unit) {
			continue;
		}

		let policyId = unit.slice(0, 56);
		let name = unit.slice(57);
		amount[i].unit = policyId + "." + name;
	}

	return amount;
}

function number2String(value) {
	if (typeof value === 'string') {
		return value;
	} else {
		return value.toString();
	}
}

function convertIndexApiEvaluateRet(ret) {
	let formateRet = {};
	for (let i = 0; i < ret.length; i++) {
		let item = ret[i];
		let itemName = item.redeemer_tag + ":" + item.redeemer_index;
		let itemValue = {
			"memory": 0,
			"steps": 0,
			"cpus": 0
		};
		itemValue.memory = item.ex_units.mem;
		itemValue.steps = item.ex_units.steps;
		itemValue.cpus = item.ex_units.steps;

		formateRet[itemName] = itemValue;
	}

	return formateRet;
}


function convertBlockFrostEvaluateRet(ret) {
	//  {"spend:0":{"memory":342107,"steps":107536290},"spend:1":{"memory":603993,"steps":185008555}}
	let formateRet = {};
	for (let itemName in ret) {
		let item = ret[itemName];
		let itemValue = {
			"memory": 0,
			"steps": 0,
			"cpus": 0
		};
		itemValue.memory = item.memory;
		itemValue.steps = item.steps;
		itemValue.cpus = item.steps;

		formateRet[itemName] = itemValue;
	}

	return formateRet;
}

function convertBlockFrostUtxo2MaestroUtxo(utxoItem) {
	if (undefined === utxoItem) {
		return undefined;
	}

	let value = {};
	let itemScript = null;
	for (let idx = 0; idx < utxoItem.amount.length; ++idx) {
		/*
		"amount": [
			{
				"unit": "lovelace",
				"quantity": "42000000"
			},
			{
				"unit": "b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e",
				"quantity": "12"
			}
			]		
		*/
		let asset = utxoItem.amount[idx];
		if (asset.unit === "lovelace") {
			value["ada"] = {
				"lovelace": asset.quantity
			}
		} else {
			let unit = asset.unit.substring(0, 56);
			let name = asset.unit.substring(56);
			if (undefined === value[unit]) {
				value[unit] = {};
			}
			value[unit][name] = asset.quantity;
		}
	}

	let formatUtxo = {
		transaction: {
			id: utxoItem.tx_hash
		},
		index: utxoItem.output_index,
		address: utxoItem.address,
		value: value,
		datum: utxoItem.inline_datum ? utxoItem.inline_datum : undefined,
		datumHash: utxoItem.data_hash ? utxoItem.data_hash : undefined,
		script: utxoItem.reference_script_hash ? utxoItem.reference_script_hash : undefined
	}

	return formatUtxo;
}

function convertFloat2FractionValue(fValue){
	const bnValue = new BigNumber(fValue);
	let ret = bnValue.toFraction(); // [ '7', '4' ] 即 7/4[reference:2]
	const fractionValue = ret[0] + "/" + ret[1];
	
	return fractionValue;
}

function formatProtocolParamsFromBlockFrost(raw) {
	let params = {};
	params.minFeeCoefficient = raw.min_fee_a;
	let bnMinFeeConstant = new BigNumber(raw.min_fee_b);
	params.minFeeConstant = bnMinFeeConstant.toNumber();

	params.maxBlockBodySize = raw.max_block_size;
	params.maxBlockHeaderSize = raw.max_block_header_size;
	params.maxTxSize = raw.max_tx_size;

	let bnStakeKeyDeposit = new BigNumber(raw.key_deposit);
	params.stakeKeyDeposit = bnStakeKeyDeposit.toNumber();
	let bnPoolDeposit = new BigNumber(raw.pool_deposit);
	params.poolDeposit = bnPoolDeposit.toNumber();

	params.poolRetirementEpochBound = raw.e_max;
	params.desiredNumberOfPools = raw.n_opt;
	params.poolInfluence = convertFloat2FractionValue(raw.a0);
	params.monetaryExpansion = convertFloat2FractionValue(raw.rho);
	params.treasuryExpansion = convertFloat2FractionValue(raw.tau);

	params.protocolVersion = {
		major: raw.protocol_major_ver,
		minor: raw.protocol_minor_ver
	} // ？？

	let bnMinPoolCost = new BigNumber(raw.min_pool_cost);
	params.minPoolCost = bnMinPoolCost.toNumber();
	params.coinsPerUtxoByte = parseInt(raw.coins_per_utxo_size);
	params.prices = {
		memory: convertFloat2FractionValue(raw.price_mem),
		steps: convertFloat2FractionValue(raw.price_step)
	},
	params.maxExecutionUnitsPerTransaction = {
		memory: parseInt(raw.max_tx_ex_mem),
		steps: parseInt(raw.max_tx_ex_steps)
	},
	params.maxExecutionUnitsPerBlock = {
		memory: parseInt(raw.max_block_ex_mem),
		steps: parseInt(raw.max_block_ex_steps)
	},
	params.maxValueSize = parseInt(raw.max_val_size);
	params.collateralPercentage = raw.collateral_percent;
	params.maxCollateralInputs = raw.max_collateral_inputs;

	// let minFeeReferenceScripts = raw.min_fee_reference_scripts; // ？？
	// let range = new BigNumber(minFeeReferenceScripts.range); // ？？
	// params.range = range.toNumber(); // ？？
	params.minFeeRefScriptCostPerByte = raw.min_fee_ref_script_cost_per_byte;
	params.base = raw.min_fee_ref_script_cost_per_byte;
	// params.multiplier = minFeeReferenceScripts.multiplier;

	params.plutusCostModels = {
		"plutus:v1": raw.cost_models_raw.PlutusV1,
		"plutus:v2": raw.cost_models_raw.PlutusV2,
		"plutus:v3": raw.cost_models_raw.PlutusV3
	};

	return params;
}

function convertBlockFrostUtxoAmount(utxoValueObj) {
	console.log("\n\n..convertBlockFrostUtxoAmount begin: ", utxoValueObj);
	if (undefined === utxoValueObj) {
		return undefined;
	}

	let assetsAmountArray = new Array();
	for (let key in utxoValueObj) {
		let assets = utxoValueObj[key];
		console.log("\n..convert asset objec : ", key, assets);
		if (null == assets) {
			continue;
		}

		if ("coin" === key) {
			let adaAmountObj = {
				"unit": "lovelace",
				"quantity": assets
			}
			assetsAmountArray.push(adaAmountObj);
			console.log("..add lovelace: ", adaAmountObj);

		} else {
			for (let id in assets) {
				let tokensAmount = assets[id];

				for (let name in tokensAmount) {
					let tokenId = id + "." + name;
					let tokenAmountObj = {
						"unit": tokenId,
						"quantity": tokensAmount[name]
					}
					assetsAmountArray.push(tokenAmountObj);
					console.log("..add asset: ", tokenId, tokensAmount[name]);
				}
			}
		}
	}

	console.log("..convertBlockFrostUtxoAmount result: ", assetsAmountArray);

	return assetsAmountArray;
}

function encodePlutusData(jsonData) {
	console.log("\n\n...encodePlutusData..jsonData: ", jsonData);
	const plutusData = CardanoWasm.PlutusData.from_json(
		jsonData,
		CardanoWasm.PlutusDatumSchema.DetailedSchema
	);

	// 得到 CBOR hex
	const cborHex = Buffer.from(plutusData.to_bytes()).toString('hex');
	console.log('PlutusData CBOR:', cborHex);

	// 也可以直接拿 hash
	const dataHash = CardanoWasm.hash_plutus_data(plutusData);
	const strHash = Buffer.from(dataHash.to_bytes()).toString('hex');
	console.log('Data Hash:', strHash);

	let ret = {
		cborHex: cborHex,
		dataHash: strHash
	}
	return ret;
}

async function decodeTxCborFromBlockFrost(txCbor) {
	const decodedTxInfo = CardanoWasm.Transaction.from_hex(txCbor);
	console.log("\n\n...decodeTxCborFromBlockFrost..txInfo: ", decodedTxInfo.to_json());
	let jsonTxInfo = decodedTxInfo.to_js_value();
	console.log("\n\n...jsonTxInfo: ", JSON.stringify(jsonTxInfo.body.mint));

	let id = "";
	let spends = "";

	let inputs = new Array();
	for (let i = 0; i < jsonTxInfo.body.inputs.length; i++) {
		let item = jsonTxInfo.body.inputs[i];
		let formatItem = {
			"transaction": item.transaction_id,
			"index": item.index
		};
		inputs.push(formatItem);

	}
	let outputs = new Array();
	for (let j = 0; j < jsonTxInfo.body.outputs.length; j++) {
		let item = jsonTxInfo.body.outputs[j];
		let datumHash = null;
		let datum = item.plutus_data?.Data;
		if (null != datum) {
			let ret = encodePlutusData(datum);
			datumHash = ret.dataHash;
			datum = ret.cborHex
		} else {
			datumHash = item.plutus_data?.DataHash;
		}
		let formatItem = {
			"address": item.address,
			"value": convertBlockFrostUtxoAmount(item.amount), // may need to transfer format
			"datumHash": datumHash,
			"datum": datum,
			"script": item.script_ref
		}
		outputs.push(formatItem);
	}

	let collaterals = new Array();
	if (jsonTxInfo.body.collateral) {
		for (let k = 0; k < jsonTxInfo.body.collateral.length; k++) {
			let item = jsonTxInfo.body.collateral[k];
			let formatItem = {
				"transaction": item.transaction_id,
				"index": item.index
			}
			collaterals.push(formatItem);
		}
	}

	let collateral_datumHash = null;
	let collateral_datum = jsonTxInfo.body.collateral_return?.plutus_data?.Data;
	if (null != collateral_datum) {
		let ret = encodePlutusData(datum);
		collateral_datumHash = ret.dataHash;
		collateral_datum = ret.cborHex;
	} else {
		collateral_datumHash = jsonTxInfo.body.collateral_return?.plutus_data?.DataHash;
	}
	let collateralReturn = {
		"address": jsonTxInfo.body.collateral_return?.address,
		"value": convertBlockFrostUtxoAmount(jsonTxInfo.body.collateral_return?.amount), // ?? format
		"datumHash": collateral_datumHash,
		"datum": collateral_datum,
		"script": jsonTxInfo.body.collateral_return?.script_ref
	};

	let fee = parseInt(jsonTxInfo.body.fee);
	let validityInterval = {
		"invalidBefore": jsonTxInfo.body.validity_start_interval, //??
		"invalidAfter": jsonTxInfo.body.ttl, // ??
	};
	let mint = jsonTxInfo.body.mint;
	let scriptIntegrityHash = jsonTxInfo.body.script_data_hash;
	let metadata = await fetchTxMetaData(txCbor);
	let redeemers = new Array();
	for (let r = 0; r < jsonTxInfo.witness_set.redeemers?.length; r++) {
		let item = jsonTxInfo.witness_set.redeemers[r];
		let validator = {
			"purpose": item.tag.toLowerCase(),
			"index": item.index
		};
		let executionUnits = {
			"memory": parseInt(item.ex_units.mem),
			"cpu": parseInt(item.ex_units.steps)
		};
		let redeemer = encodePlutusData(item.data).cborHex;

		let formatItem = {
			"redeemer": redeemer, //??
			"executionUnits": executionUnits,
			"validator": validator
		}
		redeemers.push(formatItem);
	}

	let formateTxInfo = {
		"id": "",
		"spends": "",
		"inputs": inputs,
		"outputs": outputs,
		"collaterals": collaterals,
		"collateralReturn": collateralReturn,
		"fee": fee,
		"validityInterval": validityInterval,
		"mint": mint,
		"scriptIntegrityHash": scriptIntegrityHash,
		"metadata": metadata,
		"redeemers": redeemers
	}
	console.log("\n\n...formated TxInfo: ", JSON.stringify(formateTxInfo));

	return formateTxInfo;
}

async function fetchTxMetaData(txCborHex) {
	let formatLabelsInfo = {};

	// step 1: to decord tx CBOR
	const txBytes = Buffer.from(txCborHex, 'hex');
	const tx = await cbor.decodeFirst(txBytes);
	console.log('tx', tx);

	// step 2: to get auxiliary data, tx: [body, witnessSet, isValid, auxiliaryData]
	const auxiliaryData = tx[3];
	console.log('Auxiliary Data:', auxiliaryData);
	if (isEmpty(auxiliaryData)) {
		console.log("\n\n...fetchTxMetaData...there is no valid auxiliaryData", auxiliaryData);
		return undefined;
	}

	const formatTxMetaData = {}
	for (let key of auxiliaryData.keys()) {
		// step 3-1: to get value of this label 
		const metadataValue = auxiliaryData.get(key);

		if (metadataValue.uniqueId) {
			metadataValue.uniqueId = metadataValue.uniqueId.toString('hex');
		}
		if (metadataValue.smgID) {
			metadataValue.smgID = metadataValue.smgID.toString('hex');
		}
		if (metadataValue.toAccount) {
			metadataValue.toAccount = metadataValue.toAccount.toString('hex');
		}
		console.log('metadataValue:', metadataValue);

		formatTxMetaData[key] = metadataValue;
	}

	console.log('formatTxMetaData:', formatTxMetaData);
	return formatTxMetaData;
}

function isEmpty(value) {
	if (value == null) return true;
	if (value instanceof Map || value instanceof Set) return value.size === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	return false;
}

function isNil(value) {
	return value === null || value === undefined;
}

exports.convertFloat2FractionValue = convertFloat2FractionValue;

exports.isNil = isNil;

exports.isEmpty = isEmpty;

exports.encodePlutusData = encodePlutusData;

exports.convertBlockFrostEvaluateRet = convertBlockFrostEvaluateRet;

exports.convertBlockFrostUtxoAmount = convertBlockFrostUtxoAmount;

exports.fetchTxMetaData = fetchTxMetaData;

exports.decodeTxCborFromBlockFrost = decodeTxCborFromBlockFrost;

exports.formatProtocolParamsFromBlockFrost = formatProtocolParamsFromBlockFrost;

exports.convertBlockFrostUtxo2MaestroUtxo = convertBlockFrostUtxo2MaestroUtxo;

exports.convertIndexApiEvaluateRet = convertIndexApiEvaluateRet;

exports.number2String = number2String;

exports.convertBlockForstUtxoAmount = convertBlockForstUtxoAmount;

exports.convertRedeemers2Ogmios = convertRedeemers2Ogmios;

exports.toSafeString = toSafeString;

exports.decodeCborMetaData = decodeCborMetaData;

exports.GenesisConfig = GenesisConfig;

exports.formatProtocolParamsFromIndexApi = formatProtocolParamsFromIndexApi;

exports.formatEraSummariesFromIndexApi = formatEraSummariesFromIndexApi;

exports.formatChainTipFromIndexApi = formatChainTipFromIndexApi;

exports.convertIndexApiUtxoToMaestro = convertIndexApiUtxoToMaestro;

exports.sleep = sleep;

exports.parseMetadata = parseMetadata;

exports.decodeMetadata2Json = decodeMetadata2Json;

exports.encodeUtxo = encodeUtxo;

exports.decodeMaestroMetaData = decodeMaestroMetaData;

exports.convertMaestroUtxoAmount = convertMaestroUtxoAmount;

exports.convertMaestroRedeemers = convertMaestroRedeemers;

exports.convertMaestroProtocolParams = convertMaestroProtocolParams;

exports.convertMaestroEraSummariesInfo = convertMaestroEraSummariesInfo;

exports.convertMaestroGenesisConfig = convertMaestroGenesisConfig;

exports.convertMaestroEvaluateRet = convertMaestroEvaluateRet;

exports.convertMaestroUtxoScriptInfo = convertMaestroUtxoScriptInfo;

exports.convertMaestroEvaluateRet4PlutusSdk = convertMaestroEvaluateRet4PlutusSdk;

