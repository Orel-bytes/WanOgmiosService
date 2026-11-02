function hexWith0x(hexStr) {
    if (0 > hexStr.indexOf('0x')) {
        return `0x${hexStr}`;
    }
    return hexStr;
}

// function hexStrip0x(str) {
//     return str.replace(/^0x/, '');
// }
function hexStrip0x(str) {
  if(0 > str.indexOf('0x')){
      return str;
  }
  return str.slice(2);
}

function caseInsensitive(str) {
    return str.toUpperCase();
}

function isHexString(hexStr) {
    return typeof(hexStr) === 'string' && hexStr.length > 0 && hexStr.length % 2 === 0 && /^0x[0-9a-fA-F]+/.test(hexStr);
    // const reg = new RegExp(/^0x[0-9a-fA-F]+$/gi);
    // return reg.test(hexStr);
}

// function isUtf8String(str) {
//     return new TextEncoder().encode(str).length === str.length;
// }
function isUtf8String(str) {
    return /^[\x00-\x7F]*$/.test(str);
}

function isBase64String(str) {
    const base64Pattern = "^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$";
    return new RegExp(base64Pattern).test(str);
}

function hexToAsciiString(hexStr) {
    return Buffer.from(hexStrip0x(hexStr), "hex").toString().replace(/\u0000/g, '');
}

function fromHexString(hexAsciiStr) {
    var strip0xHexAsciiStr = hexAsciiStr.replace(/^0x/, '');
    if (!strip0xHexAsciiStr) {
        return strip0xHexAsciiStr;
    }
    if (strip0xHexAsciiStr.length % 2 !== 0) {
        throw new Error(`The argument "hexAsciiStr" must be hex string.`)
    }

    var str = "";
    String.fromCharCode(strip0xHexAsciiStr)
    for (let i = 0; i < strip0xHexAsciiStr.length;) {
        str = str.concat(String.fromCharCode(`0x${strip0xHexAsciiStr[i]}${strip0xHexAsciiStr[i + 1]}`));

        i += 2;
    }
    return str;
}

function toHexString(str) {
    if (typeof (str) !== "string") {
        throw new Error(`The argument "str" must be of type string.`)
    }
    var hexAsciiStr = "0x";
    for (let i = 0; i < str.length; ++i) {
        hexAsciiStr = hexAsciiStr.concat(`00${(str.charCodeAt(i)).toString("16")}`.slice(-2));
    }
    return hexAsciiStr;
}

function encodeString(str, options) {
    options = Object.assign({}, { to: "base64" }, options);
    let buffer = options.from ? Buffer.from(str, options.from) : Buffer.from(str);
    return buffer.toString(options.to);
}

function toShortHexStr(hexStr) {
    // hexStr = "0x000000000000000000000000000000000000000000000000006465765f303237";
    let reg = new RegExp(/([0]*)([1-9]+[0-9]+)/i, "g");
    let shortHexStr = hexWith0x(hexStr.replace(reg, "$2"));
    if (shortHexStr.length % 2 !== 0) {
        const shortHexStrStrip0x = hexStrip0x(shortHexStr);
        shortHexStr = hexWith0x((shortHexStrStrip0x.padStart(shortHexStrStrip0x.length + 1, "0")))
    }
    return shortHexStr;
}

function firstToLower(str) {
    if (typeof (str) !== "string") {
        return null;
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
}

// const HEX_TABLE = [
//     '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0a', '0b', '0c', '0d', '0e', '0f',
//     '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d', '1e', '1f',
//     '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '2a', '2b', '2c', '2d', '2e', '2f',
//     '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b', '3c', '3d', '3e', '3f',
//     '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f',
//     '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '5a', '5b', '5c', '5d', '5e', '5f',
//     '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d', '6e', '6f',
//     '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '7a', '7b', '7c', '7d', '7e', '7f',
//     '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '8f',
//     '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f',
//     'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'aa', 'ab', 'ac', 'ad', 'ae', 'af',
//     'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd', 'be', 'bf',
//     'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf',
//     'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db', 'dc', 'dd', 'de', 'df',
//     'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef',
//     'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'fa', 'fb', 'fc', 'fd', 'fe', 'ff'
// ];
const HEX_TABLE = new Array(256).fill().map((_, i) => i.toString(16).padStart(2, '0'));

function uint8ArrayToHex(uint8Array) {
    if (!(uint8Array instanceof Uint8Array)) {
        throw new Error('Input must be a Uint8Array');
    }

    const length = uint8Array.length;
    if (length === 0) return ''; // 快速处理空数组

    // chunk，reduce big array‘s join
    const CHUNK_SIZE = 1024;
    let result = '';
    for (let i = 0; i < length; i += CHUNK_SIZE) {
        const chunk = uint8Array.subarray(i, Math.min(i + CHUNK_SIZE, length));
        const chunkArray = new Array(chunk.length);
        for (let j = 0; j < chunk.length; j++) {
            chunkArray[j] = HEX_TABLE[chunk[j]];
        }
        result += chunkArray.join('');
    }

    return result;
}

function reverseLowest8Bytes32(inputHexString) {
    // check if input is a valid hex string
    if (!isHexString(inputHexString)) {
    // if (typeof inputHexString !== 'string' || !/^0x[0-9a-fA-F]+$/.test(inputHexString)) {
        throw new Error('Input must be a valid hex string starting with 0x');
    }

    // convert to BigInt
    const int64Value = BigInt(inputHexString);

    // new 32 bytes Uint8Array
    const byte32Array = new Uint8Array(32);

    // reverse bytes
    let value = int64Value;
    for (let i = 24; i < 32; i++) {
        byte32Array[i] = Number(value & 0xFFn);
        value >>= 8n;
    }

    // convert Uint8Array to hex string
    return `0x${uint8ArrayToHex(byte32Array)}`;
}

function typeReplacer(key, value) {
    if (typeof value === "bigint") {
        // console.log("bigint", "key:", key)
        return value.toString(16);
    }
    if (Buffer.isBuffer(value)) {
        // console.log("Buffer.isBuffer", "key:", key)
        return value.toString("base64");
    }
    if (value instanceof Buffer) {
        // console.log("Buffer", "key:", key)
        return value.toString("base64");
    }
    return value;
}

// Lookup table of hexadecimal characters to numeric values
const hexLookup = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'a': 10, 'b': 11, 'c': 12, 'd': 13, 'e': 14, 'f': 15,
  'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15
};

// Lookup table from byte to hexadecimal character
const hexDigits = '0123456789abcdef';

// Convert hexadecimal string to Uint8Array
function hexToBytes(hex) {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const high = hex.charAt(i);
    const low = hex.charAt(i + 1);
    const byte = (hexLookup[high] << 4) | hexLookup[low];
    if (byte === undefined) throw new Error('Invalid hex digit at position ' + i);
    bytes[i / 2] = byte;
  }
  return bytes;
}

// Convert Uint8Array to hexadecimal string
function bytesToHex(bytes) {
  const hex = new Array(bytes.length * 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    hex[i * 2] = hexDigits[(byte >> 4) & 0xf];
    hex[i * 2 + 1] = hexDigits[byte & 0xf];
  }
  return hex.join('');
}

// Convert hexadecimal string to (default: UTF-8) string
function hexToString(hex, encoding = 'utf-8') {
  const bytes = hexToBytes(hex);
  const decoder = new TextDecoder(encoding);
  return decoder.decode(bytes);
}

// Convert (default: UTF-8) string to hexadecimal string
function stringToHex(str, encoding = 'utf-8') {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return bytesToHex(bytes);
}

exports.hexWith0x = hexWith0x;
exports.hexStrip0x = hexStrip0x;
exports.caseInsensitive = caseInsensitive;
exports.isHexString = isHexString;
exports.isUtf8String = isUtf8String;
exports.isBase64String = isBase64String;
exports.hexToAsciiString = hexToAsciiString;
exports.fromHexString = fromHexString;
exports.toHexString = toHexString;
exports.encodeString = encodeString;
exports.toShortHexStr = toShortHexStr;
exports.firstToLower = firstToLower;
exports.HEX_TABLE = HEX_TABLE;
exports.uint8ArrayToHex = uint8ArrayToHex;
exports.reverseLowest8Bytes32 = reverseLowest8Bytes32;
exports.typeReplacer = typeReplacer;