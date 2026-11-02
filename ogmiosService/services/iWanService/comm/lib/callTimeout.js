const PromiseProvider = require("comm/lib/promiseProvider");
const Promise = PromiseProvider.get();

// function promiseTimeout(promise, timeout, desc) {
//     let Promise = new Promise((resolve, reject) => {
//         let id = setTimeout(() => {
//             clearTimeout(id);
//             desc = desc || ("Timeout in", timeout, "ms");
//             reject(new Error(desc))
//         }, timeout);
//     });

//     return Promise.race([promise, Promise]);
// }

function promiseTimeout(promise, timeout, desc) {
    return new Promise((resolve, reject) => {
        promise
            .then((result) => {
                return resolve(result); // Resolve with the result
            })
            .catch((error) => {
                return reject(error); // Reject with the error
            });
    }, timeout, desc);
}

async function promiseCall(func, obj, timeout, args, resion = `promiseCall:timeout of ${timeout} ms achived`) {
    let fn;
    if (typeof (func) === "function") {
        fn = func;
    } else if (obj) {
        fn = Reflect.get(obj, func);
    }

    if (typeof (fn) !== "function") {
        throw new Error(`invalid function "${func}"`);
    }
    if (!Array.isArray(args)) {
        throw new Error(`need array, invalid arguments type "${typeof (args)}"`);
    }

    let promise;
    if (obj) {
        promise = Reflect.apply(fn, obj, args);
    } else {
        promise = fn.apply(obj, args);
    }

    return await promiseTimeout(promise, timeout, (resion));
}

async function callbackCall(func, obj, timeout, args, callback) {
    try {
        callback(undefined, await promiseCall(func, obj, timeout, args));
    } catch (err) {
        return callback(err);
    }
}

function promisefy(func, paras=[], obj=null, timeout, reason = `promisefy:timeout of ${timeout} ms achived`) {
    return new Promise(function(resolve, reject) {
        paras.push(function cb(err, ...results) {
            if (err) {
                return reject(err);
            } else {
                return resolve(...results);
            }
        });

        func.apply(obj, paras);
    }, timeout, reason);
}


exports.promiseTimeout = promiseTimeout;
exports.promiseCall = promiseCall;
exports.callbackCall = callbackCall;
exports.promisefy = promisefy;
