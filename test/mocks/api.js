module.exports = function(options) {
  var opts = options;
  opts.latency = opts.latency || 0
  var org = null;
  return {
    organizations: {
      getOne: function(filter) {
        return new Promise(function(resolve, reject){
          if(filter.hostname === 'INVALID') {
            setTimeout(function() { 
              reject({ 
                status: 404, 
                statusText: 'Not Found', 
                data: 'Not Found'
              })
            }, opts.latency)
          }

          setTimeout(function() { 
            resolve({ 
              status: 200, 
              statusText: 'ok', 
              data: { 
                ID: filter.hostname, 
                parentID: "clubcar"
              }
            })
          }, opts.latency)
        })
      },
      getMany: function(filter){
        return new Promise(function(resolve, reject) {
          setTimeout(function() { 
            resolve({ 
              status: 200, 
              statusText: 'ok', 
              data: { 
                "ladds": { 
                  ID: "ladds", 
                  parentID: "clubcar"
                }
              }
            })
          }, opts.latency)
        })
      }
    }
}}
