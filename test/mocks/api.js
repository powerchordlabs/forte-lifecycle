module.exports = function(options) {
  let opts = {...{ latency: 0}, ...options}
  let org = null;
  return {
    organization: {
      get: function(hostname) {
        return new Promise((resolve, reject) => {
          if(hostname === 'INVALID') {
            setTimeout(() => reject(new Error('Unkown Organization')), opts.latency)
          }
          setTimeout(() => resolve({ ID: hostname, parentID: "clubcar"}), opts.latency)
        })
      }
    },
    organizations: {
      get: function(){
        return new Promise((resolve, reject) =>
          setTimeout(() => resolve({ "ladds": { ID: "ladds", parentID: "clubcar"}}), opts.latency)
        )
      }
    }
}}
