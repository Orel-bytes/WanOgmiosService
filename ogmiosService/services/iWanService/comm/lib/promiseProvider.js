'use strict';

const assert = require('assert');
const TimeoutPromise = require("comm/lib/timeoutPromise");

/**
 * Helper for multiplexing promise implementations
 */

const store = {
  _promise: null
};

/**
 * Get the current promise constructor
 */

store.get = function() {
  return store._promise;
};

/**
 * Set the current promise constructor
 */

store.set = function(lib) {
  assert.ok(typeof lib === 'function',
    `iWan-RPC.Promise must be a function, got ${lib}`);
  store._promise = lib;
};

/*!
 * Use native promises by default
 */

// store.set(global.Promise);
store.set(TimeoutPromise);

module.exports = store;
