import onHeaders from 'on-headers'
import impl from 'implementjs'
import stats from 'node-statsd'

const apiInterface = {
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

	let opts = {...{ orgCacheTimeout: 0 }, ...options}
	let api = config.apiClient

	let _orgCache
	let _orgsFetchPromise
	let _lastOrgFetchTimestamp

	function isStale(){
		return new Date(Date.now()-_lastOrgFetchTimestamp).getMilliseconds() >= opts.orgCacheTimeout
	}

	function resolveOrganization(hostname){
		// load all orgs if we don't have them already
		_orgsFetchPromise = 
			_orgsFetchPromise || 
			api.organizations.getAll({status: 'active'})
				.then(org => {  
					_lastOrgFetchTimestamp = Date.now(); return org;
				})

		return _orgsFetchPromise.then(organizations => {
			_orgCache = organizations
			
			let _cachedOrg = _orgCache[hostname]

			if(!_cachedOrg) {
				if(isStale()){
					return api.organizations.getOne({hostname: hostname, status: 'active'})
						.then(org => { 
							_lastOrgFetchTimestamp = Date.now()
							_orgCache[hostname] = org
							return org
						})
				}
				throw new Error('Unknown Organization')
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
				res.statusCode = err.statusCode || 500
        		res.end(err.body || err.message)
			})
			.then(next)
	}
}
