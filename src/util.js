/* istanbul ignore next */
var assign = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }

var debug = {
    info: require('debug')('forte-lifecycle:info'),
    warn: require('debug')('forte-lifecycle:warn'),
    error: require('debug')('forte-lifecycle:error')
}

exports.assign = module.exports.assign = assign
exports.debug = module.exports.debug = debug
