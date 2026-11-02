const fetch = require("node-fetch");
const https = require("https");

const {
    getError,
} = require('comm/lib/error');
const {
    jsonrpc,
} = require('comm/lib/common');


const httpMethods = {
    GET: "GET",
    POST: "POST",
};

function handleFailure(log, functionName, err, uniqueId = "", code = "-32000") {
    log.warn(log.__line(), ':something is wrong when ', functionName, uniqueId || "", ', ', err);
    let reply = {
        // jsonrpc: jsonrpc,
        // error: {
        // code: code,
        // message: getError(err) || JSON.stringify(err)
        // }
        // error:(err.hasOwnProperty("message")) ? err.message : err
        error: getError(err) || JSON.stringify(err)
    };
    return reply;
}

/* Socket status:
  CONNECTING: 0	The connection is not yet open.
  OPEN:       1	The connection is open and ready to communicate.
  CLOSING:    2	The connection is in the process of closing.
  CLOSED:     3	The connection is closed or couldn't be opened.
 */
function socketSafeSend(log, socket, id, msg, uniqueId) {
    try {
        let data;
        if (msg.result && typeof (msg.result) === 'object' && msg.result.hasOwnProperty('jsonrpc')) {
            data = JSON.stringify(msg.result);
        } else {
            let result = {
                jsonrpc: jsonrpc,
                id: id
            };
            data = JSON.stringify(Object.assign(result, msg));
        }

        socket.send(data);
        // socket.send(JSON.stringify(Object.assign(result, msg)));
    } catch (err) {
        log.error("Error: send to client failed. Socket status is", socket.readyState, (uniqueId || ""), "error:", err);
    }
}

function parseHttpArgv(url, method, options) {
    let result;
    switch (method) {
        case httpMethods.GET: {
            let abUrl = url;
            if (options) {
                let paramsArray = [];
                Object.keys(options).forEach(key => paramsArray.push(key + '=' + options[key]))
                if (abUrl.search(/\?/) === -1) {
                    abUrl += '?' + paramsArray.join('&')
                } else {
                    abUrl += '&' + paramsArray.join('&')
                }
            }
            result = {
                url: abUrl,
                options: {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            }
            break;
        };
        default: {
            result = {
                url: url,
                options: {
                    method: httpMethods.POST,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(options)
                }
            }
            break;
        };
    }

    return result;
}

async function fetchUrl(url, method, options, callback) {
    let response;
    let text;
    let json;

    let cb = (err, result, callback) => {
        if (typeof (callback) === "function") {
            return err ? callback(getError(err)) : callback(err, result);
        }
        if (err) {
            throw err;
        }
        return result;
    }
    try {
        let config = parseHttpArgv(url, method, options);
        response = await fetch(config.url, config.options);
        text = await response.text();
        json = JSON.parse(text);
        if (json.processed && json.processed.except) {
            return cb(json, null, callback);
        }
    } catch (err) {
        if (response && typeof (text) !== "undefined" && !json) {
            json = text;
        } else {
            return cb(err, null, callback);
        }
    }
    if (!response.ok) {
        return cb(json, null, callback);
    }
    return cb(null, json, callback);
}

function httpGet(url, callback) {
    const timeout = 60000;
    let req = https.get(url, (res) => {
        let text = '';
        res.on('data', (chunk) => {
            text += chunk;
        });
        res.on('end', () => {
            return callback(undefined, text)
        });
    }).on('error', (err) => {
        return callback(err);
    });
    req.setTimeout(timeout, function () {
        req.abort();
        return callback(`request timeout "${timeout / 1000}" seconds`);
    });
}


exports.httpMethods = httpMethods;
exports.handleFailure = handleFailure;
exports.socketSafeSend = socketSafeSend;
exports.parseHttpArgv = parseHttpArgv;
exports.fetchUrl = fetchUrl;
exports.httpGet = httpGet;
