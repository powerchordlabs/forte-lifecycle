import onHeaders from 'on-headers'
import impl from 'implementjs'

const apiInterface = {
	perf: impl.F,
	organization: { 
		get: impl.F
	}, 
	organizations: { 
		get: impl.F
	}
}

const statsInterface = {
	histogram: impl.F
}

function verifyConfig(config) {
	// assert interface requirements
	impl.implements(config.apiClient, apiInterface)
	impl.implements(config.statsClient, statsInterface)
}

module.exports = function forteServer(config, options) {

	verifyConfig(config)

	let opts = {...{ orgCacheTimeout: 0 }, ...options}
	let api = config.apiClient
	let stats = config.statsClient

	let _orgCache
	let _orgsFetchPromise
	let _lastOrgFetchTimestamp

	function isStale(){
		return new Date(Date.now()-_lastOrgFetchTimestamp).getMilliseconds() >= opts.orgCacheTimeout
	}

	function resolveOrganization(hostname){
		// load all orgs if we don't have them already
		_orgsFetchPromise = _orgsFetchPromise || api.organizations.get()
				.then(org => {  _lastOrgFetchTimestamp = Date.now(); return org;})

		return _orgsFetchPromise.then(organizations => {
			_orgCache = organizations
			
			let _cachedOrg = _orgCache[hostname]

			if(!_cachedOrg) {
				if(isStale()){
					return api.organization.get(hostname)
						.then(org => { 
							_lastOrgFetchTimestamp = Date.now()
							_orgCache[hostname] = org
							return org
						})
				}
				throw new Error('Unkown Organization')
			}

			return {..._cachedOrg}
		})
	}

	return function forteServer(req, res, next){

		// track render time
		var start = Date.now()
		onHeaders(res, () => {
			res.renderTime = Date.now()-start
			stats.histogram('server.renderTime', res.renderTime, {url: req.url})
		})

		resolveOrganization(req.headers.host)
			.then(organization => { 
				req.organization = organization 
			}, err => {
				res.statusCode = 500
        		res.end(err.message)
        		return
			})
			.then(next)
	}
}
