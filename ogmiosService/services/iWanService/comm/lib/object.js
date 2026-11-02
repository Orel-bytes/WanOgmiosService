function isIgnoredObjKey(key, obj) {
    return obj[key] == null || obj[key] == undefined || obj[key] == "";
}
function sortObject(obj) {
    if (!obj || typeof (obj) != "object") {
        return obj
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sortObject(item));
    }
    var sortedKeys = Object.keys(obj).sort();
    var sortedObj = {};
    for (const key of sortedKeys) {
        if (!isIgnoredObjKey(key, obj)) {
            sortedObj[key] = obj[key];
        }
    }
    return sortedObj;
}

exports.sortObject = sortObject;
