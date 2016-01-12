module.exports = function(options) {
  var opts = options;
  opts.latency = opts.latency || 0
  var org = null;
  return {
    organizations: {
      getOne: function(filter) {
        return new Promise(function(resolve, reject){
          if(filter.hostname === 'INVALID') {
            setTimeout(function() { reject({statusCode: 404, body: 'Unknown Organization'}) }, opts.latency)
          }
          setTimeout(function() { resolve({ ID: filter.hostname, parentID: "clubcar"}) }, opts.latency)
        })
      },
      getAll: function(filter){
        return new Promise(function(resolve, reject) {
          setTimeout(function() { resolve({ "ladds": { ID: "ladds", parentID: "clubcar"}}) }, opts.latency)
        }
        )
      }
    }
}}
