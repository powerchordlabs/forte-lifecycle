module.exports = impl

// tests whether the specified object has the specified path
function deeptest(testObj, keyPath) {
    keyPath = keyPath.split('.')
    var cKey = keyPath.shift();

    function get(pObj, pKey) {
        return pObj[pKey];
    }

    var obj = get(testObj, cKey);

    while (obj && keyPath.length) {
        obj = get(obj, keyPath.shift());
    }

    return typeof(obj) !== 'undefined';
}

// tests whether the specified object has the specified paths
function impl(obj, paths) {
    if(obj == null || typeof obj !== 'object'){
        throw TypeError('instance is not an Object');
    }

    if (paths == null) {
      return true;
    }

    if (!Array.isArray(paths)) {
      throw new TypeError('interface must be an Array');
    }

    paths = [].concat(paths)

	while (paths.length) {
      if(!deeptest(obj, paths.shift())){
        // get out early
        return false
      }
	}
		
	return true
}