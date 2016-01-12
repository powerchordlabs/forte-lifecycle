var onHeaders = require('on-headers')
var impl = require('implementjs')
var stats = require('node-statsd')

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var apiInterface = {
	organizations: { 
		getAll: impl.F,
		getOne: impl.F
	}
}

function verifyConfig(config) {
	// assert interface requirements
	impl.implements(config.apiClient, apiInterface)
}

module.exports = function forteServer(config, options) {

	verifyConfig(config)

	var opts = _extends({}, { orgCacheTimeout: 0 }, options)
	var api = config.apiClient

	var _orgCache
	var _orgsFetchPromise
	var _lastOrgFetchTimestamp

	function isStale(){
		return new Date(Date.now()-_lastOrgFetchTimestamp).getMilliseconds() >= opts.orgCacheTimeout
	}

	function resolveOrganization(hostname){
		// load all orgs if we don't have them already
		_orgsFetchPromise = 
			_orgsFetchPromise || 
			api.organizations.getAll({status: 'active'})
				.then(function(org) {  
					_lastOrgFetchTimestamp = Date.now(); return org;
				})

		return _orgsFetchPromise.then(function(organizations) {
			_orgCache = organizations
			
			var _cachedOrg = _orgCache[hostname]

			if(!_cachedOrg) {
				if(isStale()){
					return api.organizations.getOne({hostname: hostname, status: 'active'})
						.then(function(org) { 
							_lastOrgFetchTimestamp = Date.now()
							_orgCache[hostname] = org
							return org
						})
				}
				throw new Error('Unknown Organization')
			}

			return _extends({}, _cachedOrg)
		})
	}

	return function forteServer(req, res, next){

		// track render time
		var start = Date.now()
		onHeaders(res, function() {
			res.renderTime = Date.now()-start
			stats.histogram('server.renderTime', res.renderTime, {url: req.url})
		})

		resolveOrganization(req.headers.host)
			.then(function(organization) { 
				req.organization = organization 
			}, function(err) {
				res.statusCode = err.statusCode || 500
        		res.end(err.body || err.message)
			})
			.then(next)
	}
}
