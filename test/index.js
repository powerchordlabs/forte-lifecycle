var forteLifecycle = require('../lib/')
var assert = require('assert')
var http = require('http')
var request = require('supertest')
var mockApi = require('./mocks/api')

describe('forteLifecycle', function(){

  it('should throw an error when the apiClient does not implement the proper interface methods', function(){
    assert.throws(function(){ forteLifecycle({}) })
  })

  var server 

  before(function(){
    server = createServer(forteLifecycle(mockApi({latency: 250})))
  })

  describe('when a request is processed with a valid hostname', function(){
    it('should have a request.organization property', function(done){
      request(server)
      .get('/')
      .set('host', 'ladds')
      .expect(200, '{"ID":"ladds","parentID":"clubcar"}', done)
    })
  })

  describe('when a request is processed with a valid, but not cached hostname', function(){
    it('should have a request.organization property', function(done){
      request(server)
      .get('/')
      .set('host', 'NEWORG')
      .expect(200, '{"ID":"NEWORG","parentID":"clubcar"}', done)
    })
  })

  describe('when a request is processed with an invalid hostname', function(){
    it('should return an error statusCode', function(done){
      request(server)
      .get('/')
      .set('host', 'INVALID')
      .expect(500, 'Unkown Organization', done)
    })
  })
})

function createServer(middleware) {
  
  return http.createServer(function(req, res){
    middleware(req, res, function(err){
      if (err) {
        res.statusCode = 500
        res.end(err.message)
        return
      }

      res.end(JSON.stringify(req.organization))
    })
  })
}