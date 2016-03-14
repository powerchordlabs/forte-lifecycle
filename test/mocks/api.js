module.exports = function(options) {
  var opts = options;
  opts.latency = opts.latency || 0
  var org = null;
  return {
    getScope: function(){
      return {
        hostname: 'example.com',
        trunk: 'ROOT_TRUNK',
        branch: ''
      }
    },
    experience: {
      bootstrap: function(id){
        return new Promise(function(resolve, reject) {
          setTimeout(function() { 
            resolve({ 
              status: 200, 
              statusText: 'ok', 
              body: [
                { 
                  ID: "dealer1", 
                  hostname: "dealer1"
                }
              ]
            })
          }, opts.latency)
        })
      }
    }
}}
