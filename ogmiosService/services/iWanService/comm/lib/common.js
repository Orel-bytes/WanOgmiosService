
const unzipper = require('unzipper');
const https = require('https');
const path = require("path");
const url = require("url");
const fs = require('fs');
// const uuid = require('uuid');
const axios = require('axios');
const jsonrpc = '2.0';
const Mutex = require('async-mutex').Mutex;

// function genUUID() {
//   return uuid.v1();
// }

function isValidNumber(number) {
  if (typeof (number) !== "number" || !(/^\d+$/.test(number))) {
    return false;
  }
  return true;
}

function sleep(time) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve();
    }, time);
  })
}

function deepArrayFlatten(arr) {
  return [].concat(...arr.map(v => Array.isArray(v) ? deepArrayFlatten(v) : v));
}

async function doWait(response) {
  return response instanceof Promise ? await response : response;
}

function ipToNumber(ip) {
  let num = 0;
  if (!ip) { return num; }
  let aNum = ip.split(".");
  if (aNum.length != 4) { return num; }

  const toInt = (value) => {
    let res = parseInt(value);
    return isNaN(res) ? 0 : res;
  };
  num += toInt(aNum[0]) << 24;
  num += toInt(aNum[1]) << 16;
  num += toInt(aNum[2]) << 8;
  num += toInt(aNum[3]) << 0;
  num = num >>> 0;

  return num;
}

// excludeKeys key-Array
function objectAssign(obj1, excludeKeys = []) {
  let obj = {};;
  for (let k in obj1) {
    if (excludeKeys.includes(k)) {
      continue;
    }
    obj[k] = obj1[k];
  }
  return obj
}

function toClientVersion(strVersion) {
  const [majorVersion, minorVersion, incrementalVersion] = strVersion.split(".").map(v => Number(v));
  if (Number.isNaN(majorVersion) || Number.isNaN(minorVersion) || Number.isNaN(incrementalVersion)) {
    throw new Error(`invalid version, should be "x.y.z"`);
  }
  return [majorVersion, minorVersion, incrementalVersion];
}

function cartesianArray(topics) {
  if (!Array.isArray(topics) || !topics.length) {
    return [];
  }
  if (topics.length === 1) {
    return Array.isArray(topics[0])
      ? topics.flatMap(topic => Array.isArray(topic) ? topic.map(v => [v]) : topic)
      : [topics]
      ;
  }

  let lastReduced = topics.reduce((reduced, topic) => {
    Array.isArray(reduced) || (reduced = [reduced]);
    Array.isArray(topic) || (topic = [topic]);
    reduced.length || (reduced = [null]);
    topic.length || (topic = [null]);
    return reduced.flatMap(reducedItem => topic.map(topicItem => ([reducedItem, topicItem].flat())));
  });
  if (!lastReduced) {
    lastReduced = [];
  } else if (!Array.isArray(lastReduced)) {
    lastReduced = [lastReduced];
  } else if (lastReduced.length === 1 && !Array.isArray(lastReduced[0])) {
    lastReduced = [lastReduced];
  }
  return lastReduced;
}

function genNestedObject(properties, options) {
  var obj = {};
  if (!properties || !Array.isArray(properties || !properties.length)) {
    return obj;
  }
  const isEmptyObj = options && options.isEmptyObj || false;
  const multiPropertyArray = cartesianArray(properties);
  if (!Array.isArray(multiPropertyArray)) {
    obj[multiPropertyArray] = {};
  } else {
    for (let propertyArray of multiPropertyArray) {
      for (let i in propertyArray) {
        let innerObj = obj;
        for (let j = 0; j < i; ++j) {
          innerObj = innerObj[propertyArray[j]];
        }
        if (isEmptyObj) {
          innerObj[propertyArray[i]] = {};
        } else {
          innerObj[propertyArray[i]] || (innerObj[propertyArray[i]] = {});
        }
      }
    }
  }
  return obj;
}

function toNonExponential(num) {
  let m = num.toExponential().match(/\d(?:\.(\d*))?e([+-]\d+)/);
  return num.toFixed(Math.max(0, (m[1] || '').length - m[2]));
}

function getFuncName(func) {
  let name = "";
  switch (typeof (func)) {
    case 'function': {
      name = func.name;
      break;
    }
    case 'string': {
      name = func;
      break;
    }
    default: {
      break;
    }
  }
  return name;
}
/**
 * Change all bigNumber fields in a json to string.
 * @param {object} json .
 * @param {number} num: 10 - Decimal; 16 - Hex
 */
function bigNumber2String(json, num) {
  for (let i in json) {
      if (json[i].constructor.name === 'BigNumber') {
          json[i] = json[i].toString(num);
      }
  }
}

function memorySizeOf(obj) {
  let bytes = 0;

  function sizeOf(obj) {
    if (obj !== null && obj !== undefined) {
      switch (typeof(obj)) {
        case 'number':
          bytes += 8;
          break;
        case 'string':
          bytes += obj.length * 2;
          break;
        case 'boolean':
          bytes += 4;
          break;
        case 'object':
          let objClass = Object.prototype.toString.call(obj).slice(8, -1);
          if (objClass === 'Object' || objClass === 'Array') {
            for (let key in obj) {
              if (!obj.key) {
                continue;
              }
              sizeOf(obj[key]);
            }
          } else {
            bytes += obj.toString().length * 2;
          }
          break;
      }
    }
    return bytes;
  };

  return sizeOf(obj);
};

function formatByteSize(obj, size) {
  let bytes = memorySizeOf(obj);
  if (bytes < size) {
    return obj;
  } else {
    if (typeof obj === 'string') {
      return obj.substr(0, size / 2) + '...';
    } else if (typeof obj === 'object') {
      let objClass = Object.prototype.toString.call(obj).slice(8, -1);
      if (objClass === 'Object' || objClass === 'Array') {
        for (let key in obj) {
          if (!obj.key) continue;
          if (memorySizeOf(obj[key]) > size) {
            if (typeof obj[key] === 'string') {
              obj[key] = obj[key].substr(0, size / 2) + '...';
            } else if (Object.prototype.toString.call(obj[key]).slice(8, -1) === 'Array') {
              obj[key] = obj[key][0];
            } else if (Object.prototype.toString.call(obj[key]).slice(8, -1) === 'Object') {
              obj[key] = JSON.stringify(obj[key]).substr(0, size / 2) + '...';
            } else {
              obj[key] = obj[key].toString().substr(0, size / 2) + '...';
            }
          }
        }
      } else {
        obj = obj.toString().substr(0, size / 2) + '...';
      }
      return obj;
    }
  }
};

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

Date.prototype.pattern = function (fmt) {
  let o = {
    "M+": this.getMonth() + 1, //month
    "d+": this.getDate(), //date
    "h+": this.getHours() % 12 == 0 ? 12 : this.getHours() % 12, //12-hour
    "H+": this.getHours(), //24-hour
    "m+": this.getMinutes(), //min
    "s+": this.getSeconds(), //s
    "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
    "S": this.getMilliseconds() //ms
  };
  let week = {
    "0": "/u65e5",
    "1": "/u4e00",
    "2": "/u4e8c",
    "3": "/u4e09",
    "4": "/u56db",
    "5": "/u4e94",
    "6": "/u516d"
  };
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  }
  if (/(E+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? "/u661f/u671f" : "/u5468") : "") + week[this.getDay() + ""]);
  }
  for (let k in o) {
    if (new RegExp("(" + k + ")").test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    }
  }
  return fmt;
}

function addToSimpleObject(obj, ...args) {
  const value = args.pop();
  if (args.length > 0) {
    const setValueKey = args.pop();
    let tmp = obj;
    for (let i = 0; i < args.length; i++) {
      if (!tmp.hasOwnProperty(args[i]) && !tmp[args[i]]) {
        tmp[args[i]] = {};
      }
      tmp = tmp[args[i]];
    }
    tmp[setValueKey] = value;
  } else {
    obj = value
  }
  return obj;
}

function getPortFromUrl(url) {
  const urlObj = new URL(url);
  if (urlObj.port) {
    return urlObj.port;
  }
  switch (urlObj.protocol) {
    case "ws:":
    case "http:": {
      return "80";
    }
    case "wss:":
    case "https:": {
      return "443";
    }
    case "ftp:": {
      return "21";
    }
    default: {
      throw new Error(`unknown protocal about "${url}"`);
    }
  }
}

function getFileInfo(filePath) {
  try {
    // console.log("getFileInfo ===> filePath", filePath)
    const stats = fs.statSync(filePath);
    // console.log(`文件路径: ${filePath}`);
    // console.log(`文件大小: ${stats.size} 字节`);
    // console.log(`创建时间: ${stats.birthtime}    UTC ${new Date(stats.birthtime)}    UTC timestamp ${(new Date(stats.birthtime)).getTime()}`);
    // console.log(`修改时间: ${stats.mtime}    UTC ${new Date(stats.mtime)}    UTC timestamp ${(new Date(stats.mtime)).getTime()}`);
    return [true, (new Date(stats.birthtime)).getTime(), (new Date(stats.mtime)).getTime()];
  } catch (err) {
    // console.log("getFileInfo error:", err)
    return [false];
  }
}

function unzipFile(zipFilePath) {
  let filePaths;
  return new Promise((resolve, reject) => {
    const unzipStream = fs.createReadStream(zipFilePath).pipe(unzipper.Parse());

    const cleanup = () => {
      unzipStream.removeListener('entry', onEntry);
      // unzipStream.removeListener('finish', onFinish);
      unzipStream.removeListener('close', onClose);
      unzipStream.removeListener('error', onError);
    };
    function addListeners() {
      unzipStream.on('entry', onEntry);
      unzipStream.on('close', onClose);
      // unzipStream.on('finish', onFinish);
      unzipStream.on('error', onError);
    };
    const onEntry = entry => {
      const filePath = entry.path;
      const type = entry.type; // 'Directory' or 'File'
      if (type === 'File') {
        // console.log("ready to save filePath:", filePath)
        entry.pipe(fs.createWriteStream(filePath));
        filePaths.push(filePath);
      } else {
          entry.autodrain();
      }
    };
    // const onFinish = () => {
    //   cleanup(unzipStream);
    //   unzipStream.close(() => resolve(filePaths));
    // };
    const onClose = () => {
      cleanup();
      unzipStream.close(() => resolve(filePaths.length > 0 ? resolve(filePaths) : reject(`not found files "${filePaths}"`)));
    }
    const onError = (error) => {
      cleanup();
      filePaths.map(filePath => {
        try {
          removeFile(filePath)
        } catch (err) {
          // console.log(`remove file "${filePath}" error:`, err);
        }
      })
      return reject(error);
    }

    addListeners();
  });
}

function createMutex() {
  return new Mutex;
}

// function unzipFileTo(zipFilePath, customFilePath) {
//   let filePath;
//   return new Promise((resolve, reject) => {
//     const unzipStream = fs.createReadStream(zipFilePath).pipe(unzipper.Parse());
//     addListeners(unzipStream);

//     function cleanup(unzipStream) {
//       unzipStream.removeListener('entry', onEntry);
//       unzipStream.removeListener('close', onCloseFunc(unzipStream));
//       unzipStream.removeListener('error', onErrorFunc(unzipStream));
//     };
//     function addListeners(unzipStream) {
//       unzipStream.on('entry', onEntry);
//       unzipStream.on('close', onCloseFunc(unzipStream));
//       unzipStream.on('error', onErrorFunc(unzipStream));
//     };
//     async function onEntry(entry) {
//       try {
//         // const fileName = entry.path;
//         const type = entry.type; // 'Directory' or 'File'
//         if (type === 'File') {
//           filePath = !!customFilePath ? customFilePath : entry.path;
//           console.log("ready to save filePath:", filePath)
//           await streamToFile(entry, filePath)
//           console.log("save success, filePath:", filePath)
//           // entry.pipe(fs.createWriteStream(filePath));
//         } else {
//           entry.autodrain();
//         }
//       } catch (err) {
//         unzipStream.destroy(err);
//       }
//     };
//     function onCloseFunc(unzipStream) {
//       return () => {
//         console.log('Unzipping completed.');
//         cleanup(unzipStream);
//         console.log("clearn up, filePath:", filePath)
//         filePath ? resolve(filePath) : reject(`not found file "${filePath}"`);
//       }
//     };
//     function onErrorFunc(unzipStream) {
//       return err => {
//         cleanup(unzipStream);
//         try {
//           fs.unlinkSync(filePath);
//         } catch (error) {
//           console.log(`remove "${zipFilePath}" OR "${filePath}" error:`, error);
//         }
//         reject(err);
//       }
//     }
//   });
// }

function unzipFileTo(zipFilePath, customFilePath) {
  let filePath;
  return new Promise((resolve, reject) => {
    const unzipStream = fs.createReadStream(zipFilePath).pipe(unzipper.Parse());

    function cleanup() {
      unzipStream.removeListener('entry', onEntry);
      unzipStream.removeListener('close', onClose);
      unzipStream.removeListener('error', onError);
    };
    function addListeners() {
      unzipStream.on('entry', onEntry);
      unzipStream.on('close', onClose);
      unzipStream.on('error', onError);
    };
    async function onEntry(entry) {
      try {
        // const fileName = entry.path;
        const type = entry.type; // 'Directory' or 'File'
        if (type === 'File') {
          filePath = !!customFilePath ? customFilePath : entry.path;
          // console.log("ready to save filePath:", filePath)
          await streamToFile(entry, filePath)
          // console.log("save success, filePath:", filePath)
          // entry.pipe(fs.createWriteStream(filePath));
        } else {
          entry.autodrain();
        }
      } catch (err) {
        unzipStream.destroy(err);
      }
    };
    function onClose() {
      // console.log('Unzipping completed.');
      cleanup();
      // console.log("clearn up, filePath:", filePath)
      filePath ? resolve(filePath) : reject(`not found file "${filePath}"`);
    };
    function onError(err) {
        cleanup();
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          // console.log(`remove "${zipFilePath}" OR "${filePath}" error:`, error);
        }
        reject(err);
      }

      addListeners();
    });
}

function parseUrlFilename(webUrl) {
  const webUrlJson = url.parse(webUrl);
  const pathJson = path.parse(webUrlJson.path);
  const filename = path.join(process.cwd(), pathJson.base);
  return filename;
}

function streamToFile(response, filename) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filename);
    response.pipe(fileStream);

    function onFinish() {
      cleanup(fileStream);
      fileStream.close(resolve);
    };
    function onError(err) {
      cleanup(fileStream);
      fs.unlink(filename, () => reject(err));
    };
    function cleanup() {
      fileStream.removeListener('finish', onFinish);
      fileStream.removeListener('error', onError);
    };
    function addListeners() {
      fileStream.on('finish', onFinish);
      fileStream.on('error', onError);
    };

    addListeners();
  });
}

function isExistFile(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}
function removeFile(filePath) {
  if (isExistFile(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function downloadWebFile(log, webUrl, options) {
  const functionTag = "downloadWebFile ===>";
  options = Object.assign({}, {maxRedirects: 1}, options);
  // console.log("downloadWebFile ===> webUrl:", webUrl);
  // console.log("downloadWebFile ===> options:", options);
  if (!options.filename) {
    options.filename = parseUrlFilename(webUrl);
  }

  const reqOptions = {
    ...url.parse(webUrl),
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    },
    timeout: 10000,
  };
  // console.log("downloadWebFile ===> reqOptions:", reqOptions);

  return new Promise((resolve, reject) => {
    const request = https.request(reqOptions, async (response) => {
      try {
        if (response.statusCode === 200) {
          const cleanup = () => {
            response.removeListener('end', onEnd);
          };
          const onEnd = () => {
            cleanup();
            // console.log(functionTag, "download file", options.filename);
            resolve(options.filename);
          };
          response.on('end', onEnd);
          await streamToFile(response, options.filename);
          // console.log("streamToFile", options.filename);
        } else if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
          --options.maxRedirects;
          // console.log("location", response.headers.location)
          if (--options.maxRedirects <= 0) {
            // console.log(functionTag, "Too many  Not redirects");
            return reject(new Error('Too many  Not redirects'))
          } else {
            return resolve(await downloadWebFile(log, response.headers.location, options));
          }
        } else if (response.statusCode == 405) {
          // console.log(functionTag, 'Method Not Allowed')
          return reject(new Error('Method Not Allowed'));
        } else {
          const errorMessage = `Unexpected statusCode: ${response.statusCode}`;
          // console.log(functionTag, errorMessage);
          return reject(new Error(errorMessage));
        }
      } catch (err) {
        // console.log(functionTag, err);
        reject(err);
      } finally {
        response.req.abort();
      }
    });
    request.on('error', error => {
      log.error(functionTag, `request error:`, error);
      reject(error);
      request.abort();
    });
    request.on('timeout', () => {
      log.error(functionTag, `Request timed out`);
      // reject(new Error('Request timed out'));
      request.destroy(`Request timed out`);
    });
    request.end();
  })
};

// list format: [{symbol:"xxx",id:"xxx"}]
async function getCoingeckoPrice(log, url, list, options) {
  const functionTag = "getCoingeckoPrice ===>";
  const {currencies, timeout} = Object.assign({}, {currencies: "usd", timeout: 1000}, options);
  const idToSymbol = list.reduce((reduced, {symbol, id}) => {
    id = id.toLowerCase();
    if (!reduced[id]) {
      reduced[id] = new Set();
    }
    reduced[id].add(symbol);
    return reduced;
  }, {});
  const tokenIDs = Object.keys(idToSymbol);
  // console.log(functionTag, "list:", list, "idToSymbol:", idToSymbol);

  let tokenPriceData = {};
  if (tokenIDs.length) {
    const baseUrlApi = new URL(url);
    baseUrlApi.searchParams.append("ids", tokenIDs);
    baseUrlApi.searchParams.append("vs_currencies", currencies);
    const response = await axios.get(baseUrlApi,{timeout})
    tokenPriceData = response.data;
    // // TODO: debug
    // tokenPriceData = {"wanchain":{"usd":0.476836},"phoenix-token":{"usd":0.00444454},"polkadot":{"usd":19.22},"chainlink":{"usd":14.01},"ocean-protocol":{"usd":0.556419},"avalanche-2":{"usd":78.3},"ripple":{"usd":0.747894},"balancer":{"usd":15.98},"maker":{"usd":1826.33},"litecoin":{"usd":110.98},"fantom":{"usd":1.18},"tether":{"usd":1.0},"sushi":{"usd":3.54},"uniswap":{"usd":9.4},"cardano":{"usd":0.94587},"ethereum":{"usd":3093.87},"tron":{"usd":0.063014},"true-usd":{"usd":1.002},"moonriver":{"usd":60.01},"eos":{"usd":2.8},"usd-coin":{"usd":0.99846},"binancecoin":{"usd":419.45},"matic-network":{"usd":1.43},"bitcoin":{"usd":41687},"dogecoin":{"usd":0.140165},"wanswap":{"usd":0.01829322},"0xcert":{"usd":0.00060828},"0chain":{"usd":0.482878},"kylin-network":{"usd":0.060757},"stasis-eurs":{"usd":1.078},"xdce-crowd-sale":{"usd":0.059645},"gemini-dollar":{"usd":1.0},"fantohm":{"usd":4.58},"vibe":{"usd":0.00954641},"templardao":{"usd":6.9},"impermax":{"usd":0.096176},"reth":{"usd":2667.92},"vee-finance":{"usd":0.0010362},"vox-finance":{"usd":2.1},"cyberfi":{"usd":2.04},"pha":{"usd":0.285175},"zookeeper":{"usd":0.076979}};
    // log.info(functionTag, `get price from coingecko end`);
  }
  // console.log(functionTag, "tokenPriceData:", tokenPriceData);
  let tokenPrice = {};
  for (const tokenID in tokenPriceData) {
    const tokenIDLowerCase = tokenID.toLowerCase();
    const symbolSet = idToSymbol[tokenIDLowerCase];
    var iterator = symbolSet.values();
    for (const symbol of iterator) {
      tokenPrice[symbol] = tokenPriceData[tokenIDLowerCase][currencies];
    }
  }
  // console.log(functionTag, "tokenPrice:", tokenPrice);
  return tokenPrice;
}


exports.jsonrpc = jsonrpc;
// exports.genUUID = genUUID;
exports.isValidNumber = isValidNumber;
exports.sleep = sleep;
exports.deepArrayFlatten = deepArrayFlatten;
exports.doWait = doWait;
exports.ipToNumber = ipToNumber;
exports.objectAssign = objectAssign;
exports.toClientVersion = toClientVersion;
exports.cartesianArray = cartesianArray;
exports.genNestedObject = genNestedObject;
exports.toNonExponential = toNonExponential;
exports.getFuncName = getFuncName;
exports.bigNumber2String = bigNumber2String;
exports.memorySizeOf = memorySizeOf;
exports.formatByteSize = formatByteSize;
exports.createDirectory = createDirectory;
exports.addToSimpleObject = addToSimpleObject;
exports.getPortFromUrl = getPortFromUrl;
exports.getFileInfo = getFileInfo;
exports.unzipFileTo = unzipFileTo;
exports.parseUrlFilename = parseUrlFilename;
exports.streamToFile = streamToFile;
exports.downloadWebFile = downloadWebFile;
exports.isExistFile = isExistFile;
exports.removeFile = removeFile;
exports.createMutex = createMutex;
exports.getCoingeckoPrice = getCoingeckoPrice;