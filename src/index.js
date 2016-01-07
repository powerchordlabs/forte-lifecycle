module.exports = function forteServer(apiClient, options) {
	let opts = {...{ orgCacheTimeout: 0 }, ...options}

	let _orgCache
	let _orgsFetchPromise
	let _lastOrgFetchTimestamp;

	function isStale(){
		return new Date(Date.now()-_lastOrgFetchTimestamp).getMilliseconds() >= opts.orgCacheTimeout
	}

	function resolveOrganization(hostname){

		// load all orgs if we don't have them already
		_orgsFetchPromise = _orgsFetchPromise || apiClient.organizations.get()
				.then(org => {  _lastOrgFetchTimestamp = Date.now(); return org;})

		return _orgsFetchPromise.then(organizations => {
			_orgCache = organizations

			let _cachedOrg = _orgCache[hostname]

			if(!_cachedOrg) {
				if(isStale()){
					return apiClient.organization.get(hostname)
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

/* psuedo...

app = express()

client = new forteApi({credentials, apiUrl})

app.use(lifecycleMiddleware(client)) // tracks render times and manages org cache

app.get('*', (req, res, next) => {
	// set the api org scope, as we have it now via the lifecycle middleware...
	// client.setOrganization(req.currentOrganization)
	// e.g. <Conductor apiClient={client} />
})


*/
