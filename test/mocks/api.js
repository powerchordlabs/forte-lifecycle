module.exports = function(options) {
  let opts = {...{ latency: 0}, ...options}
  let org = null;
  return {
    organization: {
      get: function(filter) {
        return new Promise(function(resolve, reject){
          if(filter.hostname === 'INVALID') {
            setTimeout(() => reject(new Error('Unkown Organization')), opts.latency)
          }
          setTimeout(() => resolve({ ID: filter.hostname, parentID: "clubcar"}), opts.latency)
        })
      }
    },
    organizations: {
      get: function(filter){
        return new Promise((resolve, reject) =>
          setTimeout(() => resolve({ "ladds": { ID: "ladds", parentID: "clubcar"}}), opts.latency)
        )
      }
    }
}}
