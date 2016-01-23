var assign = require('./util.js').assign
var onHeaders = require('on-headers')
var StatsD = require('node-statsd')
var normalizr = require('normalizr')
var debug = require('debug')('forte-lifecycle')

//var stats = new StatsD()

var organizationSchema = new normalizr.Schema('organizations', {
  idAttribute: 'hostname'
})

var Schemas = {
  ORGANIZATION: organizationSchema,
  ORGANIZATION_ARRAY: normalizr.arrayOf(organizationSchema),
}

module.exports = function forteLifecycle(apiClient, options) {

	verifyConfig.apply(null, arguments)

	var opts = assign({}, { lookupDelay: 60, statsd: null }, options)
	var api = apiClient
	var stats = new StatsD(opts.statsd)

	var _lastError = false
	var _orgCache
	var _orgsFetchPromise
	var _lastOrgFetchTimestamp

	function allowLookup(){
		return new Date(Date.now()-_lastOrgFetchTimestamp).getSeconds() >= opts.lookupDelay
	}

	function resolveOrganization(hostname){
		// load all orgs if we don't have them already, or we got an error last time
		_orgsFetchPromise = 
			(!_lastError && _orgsFetchPromise) ||
			api.organizations.getMany({status: 'active'})
				.then(function(response) {  
					_lastOrgFetchTimestamp = Date.now();

					var organizations = response.data
					debug('organizations returned: %d', organizations.length)

					_orgCache = assign({}, _orgCache, normalizr.normalize(organizations, Schemas.ORGANIZATION_ARRAY))
					
				}).catch(function(err) {
					_lastError = true;
				})

		return _orgsFetchPromise.then(function() {
			var _cachedOrg = _orgCache.entities.organizations[hostname]
			debug('found %d org in cache for hostname %s', _cachedOrg ? 1 : 0, hostname)

			// TODO: see ticket #2586 about creating support for getOne by hostname
			/*
			if(!_cachedOrg || _lastError) {
				//if(_lastError || allowLookup()){
					return api.organizations.getMany{hostname: hostname, status: 'active'})
						.then(function(response) { 
							debug('organization returned: %o', response.data)
							_lastOrgFetchTimestamp = Date.now()
							_orgCache[hostname] = response.data
							return _orgCache[hostname]
						}, function(response){
							debug('error calling api.organizations.getOne: %s', response)
							throw response
						})
				//}

				throw { 
    	            status: 404, 
        	        statusText: 'Not Found', 
            	    data: 'Not Found'
              	}
			}
			*/

			return assign({}, _cachedOrg)
		})
	}

	return function forteLifecycle(req, res, next){

		// track render time
		var start = Date.now()
		onHeaders(res, function() {
			res.renderTime = Date.now()-start
			stats.histogram('server.renderTime', res.renderTime, ['url:' + req.url, 'statusCode:' + res.statusCode])
		})

		resolveOrganization(req.headers.host)
			.then(function(organization) { 
				debug('organization found: \n%o', organization)
				req.lifecycle = {
					scope: {
						hostname: organization.hostname,
						trunk: organization.trunkID,
						branch: organization.ID
					}
				}
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

	if(typeof apiClient.organizations !== 'object') {
		argumentError('apiClient.organizations')
	}

	if(typeof apiClient.organizations.getMany !== 'function') {
		argumentError('apiClient.organizations.getMany')
	}

	/*
	if(typeof apiClient.organizations.getOne !== 'function') {
		argumentError('apiClient.organizations.getOne')
	}
	*/
}

