function getError(err) {
    let errorInfo = err;
    if (err.cause) {
        errorInfo = err.cause;
    } else if (err.error && typeof(err.error) === "string") {
        errorInfo = err.error;
    } else if (err.error && err.error.details && err.error.details.length && err.error.details[0].message) {
        errorInfo = err.error.details[0].message;
    } else if (err.response && err.response.data && err.response.data.error) {
        errorInfo = err.response.data.error;
    } else if (err.processed && err.processed.except && err.processed.except.message) {
        errorInfo = err.processed.except.message;
    } else if (err.message) {
        errorInfo = err.message;
    } else if (err.name) {
        errorInfo = err.name;
    } else if (err.code) {
        errorInfo = err.code;
    } else {
        errorInfo = JSON.stringify(errorInfo);
    }
    if (typeof(errorInfo) !== "string") {
        return JSON.stringify(errorInfo);
    }
    return errorInfo;
}

function markRpcErrorStatus(log, nodeRpc, error) {
    if (error && nodeRpc) {
        // console.log("markRpcErrorStatus ===> error:", error)
        typeof (error) == "object" && (error = getError(error));
        if (typeof(error) != "string") {
            error = JSON.stringify(error);
        }
        // console.log("markRpcErrorStatus ===> format error:", error)
        const E = [
            "timeout"
            , "InsufficientNetworkMode"
            , "check"
            , "auth"
            , "auth check error"
            , "Bad Gateway"
            , "internal error"
            , "Temporary internal error"
            , "Internal error"
            , "rate limit exceeded"
            , "Public RPC Rate Limit Hit"
            , "Exceeded the quota usage"
            , "Returned values aren't valid"
            , "exceed"
            , "limit"
            , "timed out"
            , "too busy"
            , "busy"
            , "ECONNREFUSED"
            , "disconnected"
            , "create rpc client failed"
            , "Too Many Requests"
            , "socket hang up"
            , "server URI must"
            , "connection failed"
            , "No response received"
            , "max message size exceed"
            , "Exceeded the quota usage"
            , "Connection attempt timed out"
            , "Internal Server Error"
            , "Request failed with status code" // 502 503
            , "Service Unavailable"
            , "503 Service Unavailable"
            , "Service Unavailable"
            , "Bad parameters in JSONRPC"
            , "Invalid WebSocket"
            , "Invalid JSON RPC response"
            , "invalid json response"
            , "TIMEOUT"
            , "Timeout"
            , "CONNECTION TIMEOUT"
            , "UND_ERR_CONNECT_TIMEOUT"
            , "CONNECTION ERROR: Couldn't connect to node"
            , "CONNECTION ERROR"
            , "ConnectTimeoutError"
            , "Couldn't connect to node"
            , "Returned error: Method not found"
            , "not found"
            , "Not Found"
            , "Returned error: provided gas limit is too high"
            , "You have reached the maximum auto-scaling quota under your current plan"
            , "No response or no available upstream"
            , "no available nodes found"
            , "the method is not allowed"
            , "does not exist/is not available"
            , "Wrong response id"
            , "fetch failed"
            , "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR"
            , "tlsv1 alert internal error"
            , "SSL routines"
            , "ModuleError"
            , "more requests"
            , "Unknown Endpoint"
            , "Not Allowed"
            , "vals.replace is not a function" // for https://rpc.goerli.optimism.gateway.fm, multicall return error as normal result, multicall decode the result error
            , "looking for beginning of value"
            , "invalid character"
            , "header for number not found"
            , "method handler crashed"
            , "no backends available for method"
            , "execution aborted"
            , "Unable to perform request"
            , "Cannot fulfill request"
            , "can't execute this request"
            , "CPU timeout for"
            , "Network request error"
            , "Bad Request"
            , "Bad status on response"
            , "couldn't complete the request"
            , "StructError"
            , "403 Forbidden"
            , "Client network socket disconnected before secure TLS connection was established"
            , "project ID exceeded quota"
            , "limit exceeded"
            , "request entity too large"
            , "Failed to receive any response from endpoints"
            , "Payment Required: Out of CU"
            , "Out of CU"
            , "History has been pruned for this block"
            , "No nodes available"
            , "no backend is currently healthy to serve traffic"
            , "system overloaded"
            , "stop generating new block"
            , "different chainID"
            , "Could not find the referenced transaction events" // add for sui pruning rpc
            , "Returned error: The method eth_getLogs is not supported." // auto swith rpc
            , "is not supported." // auto swith rpc
        ];
        if (E.some(e => error.toLowerCase().includes(e.toLowerCase()))) {
            nodeRpc.error();
            log && log.error(`url "${nodeRpc.url}" errorCount:`, nodeRpc.status().error, error);
        }
    }
}

exports.getError = getError;
exports.markRpcErrorStatus = markRpcErrorStatus;
