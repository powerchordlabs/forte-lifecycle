var assign = require('./util.js').assign
var onHeaders = require('on-headers')
var StatsD = require('node-statsd')
var normalizr = require('normalizr')
var debug = require('debug')('forte-lifecycle')
var ms = require('ms')

var organizationSchema = new normalizr.Schema('organizations', {
  idAttribute: 'hostname'
})

var Schemas = {
  ORGANIZATION: organizationSchema,
  ORGANIZATION_ARRAY: normalizr.arrayOf(organizationSchema),
}

function getCacheDurationMilliseconds(duration) {
  if(typeof duration === 'number') {
    return duration
  }
  return ms(duration)
}

module.exports = function forteLifecycle(apiClient, options) {

	verifyConfig.apply(null, arguments)

	var opts = assign({}, { cacheDuration: '15m', statsd: null }, options)
	var stats = new StatsD(opts.statsd)

	var _orgCache
	var _cacheDuration = getCacheDurationMilliseconds(opts.cacheDuration)
	var _lastCacheTimestamp
	var _trunkID = apiClient.getScope().trunk

	function isCacheValid(){
	  return _orgCache && (_lastCacheTimestamp + _cacheDuration) >= Date.now();
	}

	function resolveOrganization(hostname) {
    // REMOVE CACHING FOR NOW AND RESOLVE EVERY TIME.
		// if(isCacheValid()) {
		// 	debug('organization cache valid')
		// 	return Promise.resolve(_orgCache.entities.organizations[hostname] || {})
		// }
    //
		// debug('organization cache invalid, loading organizations')
		return apiClient.experience.bootstrap(_trunkID)
			.then(function(response) {
				_lastCacheTimestamp = Date.now();

				var organizations = response.body
				debug('organizations returned: %d', organizations.length)

				_orgCache = assign({}, _orgCache, normalizr.normalize(organizations, Schemas.ORGANIZATION_ARRAY))

        const res = {bearerToken: response.headers.authorization, organization: {}}
        const organization = _orgCache.entities.organizations[hostname]

        if (organization) {
          res.organization = organization
        }
				return res
			}).catch(function(err) {
				_lastError = true;
			})
	}

	return function forteLifecycle(req, res, next){
		// track render time
		var start = Date.now()
		onHeaders(res, function() {
			var fullUrl = req.hostname + (req.path || req.url)
			res.renderTime = Date.now()-start
			stats.histogram('server.renderTime', res.renderTime, ['url:' + fullUrl, 'statusCode:' + res.statusCode])
		})

		resolveOrganization(req.hostname)
			.then(function(response) {
				debug('organization found: \n%o', response.organization)
				req.lifecycle = {
					scope: {
						hostname: response.organization.hostname,
						trunk: _trunkID,
						branch: response.organization.ID
					}
				}
        req.lifecycle.bearerToken = response.bearerToken
				next()
			}, function(response) {
        		next(response)
			}).catch(next)
	}
}

/*
 * Custom Errors
 */
function InvalidArgumentError(message) {
	this.name = 'InvalidArgumentError';
	this.message = message;
}

InvalidArgumentError.prototype = Object.create(Error.prototype);
InvalidArgumentError.prototype.constructor = InvalidArgumentError;

/*
 * Verifcations
 */
function argumentError(name) {
	throw new InvalidArgumentError(name)
}

function verifyConfig(apiClient, options) {
	if(typeof apiClient !== 'object') {
		argumentError('apiClient')
	}

	if(typeof apiClient.experience !== 'object') {
		argumentError('apiClient.experience')
	}

	if(typeof apiClient.experience.bootstrap !== 'function') {
		argumentError('apiClient.experience.bootstrap')
	}

	/*
	if(typeof apiClient.organizations.getOne !== 'function') {
		argumentError('apiClient.organizations.getOne')
	}
	*/
}
