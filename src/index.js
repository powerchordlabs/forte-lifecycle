var assign = require('./util.js').assign
var onHeaders = require('on-headers')
var stats = require('node-statsd')

module.exports = function forteLifecycle(apiClient, options) {

	verifyConfig.apply(null, arguments)

	var opts = assign({}, { lookupDelay: 60, statsd: null }, options)
	var api = apiClient

	var _orgCache
	var _orgsFetchPromise
	var _lastOrgFetchTimestamp

	function allowLookup(){
		return new Date(Date.now()-_lastOrgFetchTimestamp).getSeconds() >= opts.lookupDelay
	}

	function resolveOrganization(hostname){
		// load all orgs if we don't have them already
		_orgsFetchPromise = 
			_orgsFetchPromise || 
			api.organizations.getMany({status: 'active'})
				.then(function(response) {  
					_lastOrgFetchTimestamp = Date.now(); 
					return response.data;
				})

		return _orgsFetchPromise.then(function(organizations) {
			_orgCache = organizations
			
			var _cachedOrg = _orgCache[hostname]

			if(!_cachedOrg) {
				if(allowLookup()){
					return api.organizations.getOne({hostname: hostname, status: 'active'})
						.then(function(response) { 
							_lastOrgFetchTimestamp = Date.now()
							_orgCache[hostname] = response.data
							return _orgCache[hostname]
						}, function(response){
							throw response
						})
				}

				throw { 
    	            status: 404, 
        	        statusText: 'Not Found', 
            	    data: 'Not Found'
              	}
			}

			return assign({}, _cachedOrg)
		})
	}

	return function forteLifecycle(req, res, next){

		// track render time
		var start = Date.now()
		onHeaders(res, function() {
			res.renderTime = Date.now()-start
			stats.histogram('server.renderTime', res.renderTime, {url: req.url})
		})

		resolveOrganization(req.headers.host)
			.then(function(organization) { 
				req.lifecycle = {
					scope: {
						trunk: organization.trunkID,
						branch: organization.ID
					}
				}
			}, function(response) {
				res.statusCode = response.status
        		res.end(response.data)
			})
			.then(next)
	}
}

/* 
 * Custom Errors
 */
function InvalidArgumentError(field) {
  this.name = 'InvalidArgumentError';
  this.message = 'Invalid Argument: ' + id;
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

	if(typeof apiClient.organizations != 'object') {
		argumentError('apiClient.organizations')
	}

	if(typeof apiClient.organizations.getMany != 'function') {
		argumentError('apiClient.organizations.getMany')
	}

	if(typeof apiClient.organizations.getOne != 'function') {
		argumentError('apiClient.organizations.getOne')
	}
}

