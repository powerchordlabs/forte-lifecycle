var forteLifecycle = require('../lib/')
var assert = require('assert')
var http = require('http')
var request = require('supertest')
var mockApi = require('./mocks/api')
var sinon = require('sinon')

describe('forteLifecycle', function(){

  it('should throw an error when the apiClient does not implement the proper interface methods', function(){
    assert.throws(function(){ forteLifecycle({}) })
  })

  var server 
  var _mockApi
  
  before(function(){
    _mockApi = mockApi({latency: 250})

    sinon.spy(_mockApi, 'perf')
    sinon.spy(_mockApi.organization, 'get')
    sinon.spy(_mockApi.organizations, 'get')

    server = createServer(forteLifecycle(_mockApi))
  })

  describe('when a request has a VALID hostname', function(){

    function trackedRenderTime(mockApi) {
      var args = mockApi.perf.lastCall.args;
      assert.equal(args.length, 3)
      assert.equal(args[0], 'server.renderTime')
    }

    describe('and hostname IS cached', function(){    
      it('request should have an organization property', function(done){
        request(server)
        .get('/')
        .set('host', 'ladds')
        .expect(200, '{"ID":"ladds","parentID":"clubcar"}', done)
      })

      it('should log a server.renderTime metric via the apiClient', function(){ trackedRenderTime(_mockApi) })
    })

    describe('and hostname IS NOT cached', function(){
      it('request should have an organization property', function(done){
        request(server)
        .get('/')
        .set('host', 'NEWORG')
        .expect(200, '{"ID":"NEWORG","parentID":"clubcar"}', done)
      })

      it('should log a server.renderTime metric via the apiClient', function(){ trackedRenderTime(_mockApi) })
    })

  })

  describe('when a request has an INVALID hostname', function(){
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