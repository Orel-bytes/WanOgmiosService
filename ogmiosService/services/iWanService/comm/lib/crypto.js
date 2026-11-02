const Crypto = require('crypto');
const CryptoJS = require("crypto-js");
const keccak = require('keccak');
const {
    hexWith0x,
    hexStrip0x,
} = require("comm/lib/string")


function keccakSignature(message) {
    return keccak('keccak256').update(message).digest('hex');
}

function genRandom(size = 32) {
    // 16 bytes is likely to be more than enough,
    // but you may tweak it to your needs
    return Crypto.randomBytes(size).toString('base64');
}

function genRandomNumber(min, max) {
    // var min = 200000000; // 200 million
    // var max = 300000000; // 300 million
    var random = Math.floor(Math.random() * (max - min + 1)) + min;
    return random;
}

function md5(message) {
    return Crypto.createHash('md5').update(message, "utf8").digest('hex');
}


const aes = {
    encrypt: (text, password, iv) => {
        let encryptedData;
        if (typeof (text) === "object") {
            text = JSON.stringify(text);
        }
        if (iv) {
            encryptedData = CryptoJS.AES.encrypt(text, password, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString();
        } else {
            encryptedData = CryptoJS.AES.encrypt(text, password).toString();
        }

        return hexWith0x(CryptoJS.enc.Utf8.parse(encryptedData).toString());
    }
    , decrypt: (encryptedData, password, iv) => {
        const encryptedHexStr = CryptoJS.enc.Hex.parse(hexStrip0x(encryptedData));
        const message = CryptoJS.enc.Utf8.stringify(encryptedHexStr);

        let bytes;
        if (iv) {
            bytes = CryptoJS.AES.decrypt(message, password, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        } else {
            bytes = CryptoJS.AES.decrypt(message, password);
        }

        let decryptedData = bytes.toString(CryptoJS.enc.Utf8);

        return decryptedData;
    }
};

const base64 = {
    isBase64: (str) => /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/.test(str)
    ,encode: (str) => btoa(str)
    ,decode: (str) => atob(str)
};

const simple = {
    encode: (mBuffer) => {
        if (!Buffer.isBuffer(mBuffer)) {
            throw new Error(`not buffer`);
        }
        const encoded = new Buffer(mBuffer.length);
        for (let i = 0; i < mBuffer.length; ++i) {
            encoded[i] = (mBuffer[i] ^ 0xff) + i;
        }
        return encoded;
    }
    ,decode: (encoded) => {
        if (!Buffer.isBuffer(encoded)) {
            encoded = Buffer.from(hexStrip0x(encoded), "hex");
        }
        const decoded = new Buffer(encoded.length)
        for (let i = 0; i < encoded.length; ++i) {
            decoded[i] = (encoded[i] - i) ^ 0xff;
        }
        return decoded;
    }
};

const customBase64 = {
    encode: (str) => {
        let buffer;
        if (typeof(str) == "string") {
            buffer = Buffer.from(hexStrip0x(str), "utf8")
        } else if (Buffer.isBuffer(str)) {
            buffer = str;
        } else {
            throw 'should be buffer'
        }
        let encoded = simple.encode(buffer);
        return encoded.toString("base64");
    }
    , decode: (str) => {
        let buffer;
        if (typeof(str) == "string") {
            if (base64.isBase64(str)) {
                buffer = Buffer.from(hexStrip0x(str), "base64")
            } else {
                buffer = Buffer.from(hexStrip0x(str), "utf8")
            }
        } else if (Buffer.isBuffer(str)) {
            buffer = str;
        } else {
            throw 'should be buffer'
        }
        let decoded = simple.decode(buffer);
        return decoded.toString("utf8");
    }
};

const crossConfig = {
    encode: (mainnet, testnet) => {
        const pwd = `__key__mainnet__wanchain__${mainnet}__key__testnet__wanchain__${testnet}`;
        return customBase64.encode(pwd);
    }
    , decode: (encoded) => {
        const pwd = customBase64.decode(encoded); // __key__mainnet__wanchain__55hsthtyhbstrg__key__testnet__wanchain__dvfsfgxb
        const regex = /__key__(.*?)__wanchain__(.*?)(?=(__key__|$))/g;
        let match;
        let result = {};
        while ((match = regex.exec(pwd)) !== null) {
            result[match[1]] = match[2];
        }
        return result; // { mainnet: '55hsthtyhbstrg', testnet: 'dvfsfgxb' }
    }
};


exports.genRandomNumber = genRandomNumber;
exports.genRandom = genRandom;
exports.keccakSignature = keccakSignature;
exports.md5 = md5;
exports.aes = aes;
exports.base64 = base64;
exports.simple = simple;
exports.customBase64 = customBase64;
exports.crossConfig = crossConfig;
