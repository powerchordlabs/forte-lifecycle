var onHeaders = require('on-headers')
var impl = require('implementjs')
var stats = require('node-statsd')

/* istanbul ignore next */
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var apiInterface = {
	organizations: { 
		getMany: impl.F,
		getOne: impl.F
	}
}

function verifyConfig(apiClient) {
	// assert interface requirements
	impl.implements(apiClient, apiInterface)
}

module.exports = function forteLifecycle(apiClient, options) {

	verifyConfig(apiClient)

	var opts = _extends({}, { lookupDelay: 60, statsd: null }, options)
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

			return _extends({}, _cachedOrg)
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
