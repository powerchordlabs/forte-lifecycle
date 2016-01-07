module.exports = {
  organization: {
    get: function(hostname) {
      if(hostname === 'INVALID') {
        return Promise.reject(new Error('Unkown Organization'))
      }
      return Promise.resolve({ ID: hostname, parentID: "clubcar"})
    }
  },
  organizations: {
    get: function(){
      return Promise.resolve({ "ladds": { ID: "ladds", parentID: "clubcar"}})
    }
  }
}
