// class TimeoutPromise { // no Promise static function
//     constructor(executor, timeout, reason = `timeout of ${timeout} ms achived`) {
//         this.promise = new Promise((resolve, reject) => {
//             let isPromiseCompleted = false;

//             // Wrap the original executor function
//             const wrappedExecutor = (res, rej) => {
//                 executor(
//                     (value) => {
//                         if (!isPromiseCompleted) {
//                             isPromiseCompleted = true;
//                             this.timer && clearTimeout(this.timer);
//                             return res(value);
//                         }
//                     },
//                     (error) => {
//                         if (!isPromiseCompleted) {
//                             isPromiseCompleted = true;
//                             this.timer && clearTimeout(this.timer);
//                             return rej(error);
//                         }
//                     }
//                 );
//             };

//             // Create the timer that will reject the promise on timeout
//             if (timeout) {
//                 this.timer = setTimeout(() => {
//                     if (!isPromiseCompleted) {
//                         isPromiseCompleted = true;
//                         reject(new Error(reason));
//                     }
//                 }, timeout);
//             }

//             // Execute the wrapped executor function
//             wrappedExecutor(resolve, reject);
//         });
//     }

//     then(onFulfilled, onRejected) {
//         return this.promise.then(onFulfilled, onRejected);
//     }

//     catch(onRejected) {
//         return this.promise.catch(onRejected);
//     }

//     finally(onFinally) {
//         return this.promise.finally(onFinally);
//     }
// }

class TimeoutPromise extends Promise {
    constructor(executor, timeout, reason = `TimeoutPromise: timeout of ${timeout} ms achived`) {
        super((resolve, reject) => {
            let isPromiseCompleted = false;
            let timer;

            const wrappedExecutor = (res, rej) => {
                executor(
                    (value) => {
                        if (!isPromiseCompleted) {
                            isPromiseCompleted = true;
                            timer && clearTimeout(timer);
                            return res(value);
                        }
                    },
                    (error) => {
                        if (!isPromiseCompleted) {
                            isPromiseCompleted = true;
                            timer && clearTimeout(timer);
                            return rej(error);
                        }
                    }
                );
            };

            if (timeout) {
                timer = setTimeout(() => {
                    if (!isPromiseCompleted) {
                        isPromiseCompleted = true;
                        return reject(new Error(reason));
                    }
                }, timeout);
            }

            wrappedExecutor(resolve, reject);
        });
    }
}

// // Example usage
// async function test(timeout) {
//     const myPromise = new TimeoutPromise((resolve) => {
//         setTimeout(() => {
//             resolve('Data received');
//         }, 2000);
//     }, timeout);
//     console.log("now:", new Date())

//     myPromise
//     .then((result) => {
//         console.log("Success:", result, new Date(), test.name);
//     })
//     .catch((error) => {
//         console.error("Error:", error, new Date(), test.name); // Output: timeout
//     });
// }
// async function testError(timeout) {
//     const myPromise = new TimeoutPromise((resolve, reject) => {
//         setTimeout(() => {
//             reject('Data error');
//         }, 2000);
//     }, timeout);
//     console.log("now:", new Date())

//     myPromise
//     .then((result) => {
//         console.log("Success:", result, new Date(), testError.name);
//     })
//     .catch((error) => {
//         console.error("Error:", error, new Date(), testError.name); // Output: timeout
//     });
// }
// async function testReson(timeout) {
//     const myPromise = new TimeoutPromise((resolve, reject) => {
//         setTimeout(() => {
//             reject('Data error');
//         }, 2000);
//     }, timeout, `remote query timeout ${timeout} ms`);
//     console.log("now:", new Date())

//     myPromise
//     .then((result) => {
//         console.log("Success:", result, new Date(), testReson.name);
//     })
//     .catch((error) => {
//         console.error("Error:", error, new Date(), testReson.name); // Output: timeout
//     });
// }
// async function testMultiThrow(count, timeout) {
//     const myPromise = new TimeoutPromise((resolve, reject) => {
//         for (let i = 0; i < count; ++i) {
//             setTimeout(() => {
//                 console.log("run reject", i)
//                 reject('Data error');
//             }, 2000);
//         }
//     }, timeout, `remote query timeout ${timeout} ms`);
//     console.log("now:", new Date())

//     myPromise
//     .then((result) => {
//         console.log("Success:", result, new Date(), testMultiThrow.name);
//     })
//     .catch((error) => {
//         console.error("Catch Error:", error, new Date(), testMultiThrow.name); // Output: timeout
//     });
//     setTimeout( () => {console.log("wait 10s")}, 10000)
// }
// test(3000)
// test(1000)
// testError(1000)
// testError(3000)
// testReson(1000)
// testReson(3000)
// testMultiThrow(2, 1000)

module.exports = TimeoutPromise;
