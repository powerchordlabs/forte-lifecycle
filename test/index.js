var forteLifecycle = require('../lib/')
var assert = require('assert')
var http = require('http')
var request = require('supertest')
var mockApi = require('./mocks/api')
var mockStats = require('./mocks/stats')
var sinon = require('sinon')

describe('forteLifecycle', function(){

  it('should throw an error when config is invalid', function(){
    assert.throws(function(){ forteLifecycle({}) })
  })

  var server 
  var _mockApi
  var _mockStats
  
  before(function(){
    _mockApi = mockApi({latency: 100})
    _mockStats = mockStats()

    sinon.spy(_mockApi.organization, 'get')
    sinon.spy(_mockApi.organizations, 'get')
    sinon.spy(_mockStats, 'histogram')

    var config = { 
      apiClient: _mockApi, 
      statsClient: _mockStats
    }

    server = createServer(forteLifecycle(config))
  })
  
  describe('when the first request is received', function(){ 
    it('the organization cache shoud be populated', function(done){
      request(server)
        .get('/')
        .set('host', 'ladds')
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          assert(_mockApi.organizations.get.calledOnce)
          done()
        })
    })
  })

  describe('when a request has a VALID hostname', function(){

    function assertTrackedRenderTime(mockStats) {
      var args = mockStats.histogram.lastCall.args;
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

      it('server.renderTime should be logged via the statsClient', function(){ assertTrackedRenderTime(_mockStats) })
    })

    describe('and hostname IS NOT cached', function(){
      it('request should have an organization property', function(done){
        request(server)
          .get('/')
          .set('host', 'NEWORG')
          .expect(200, '{"ID":"NEWORG","parentID":"clubcar"}', done)
      })

      it('server.renderTime should be logged via the statsClient', function(){ assertTrackedRenderTime(_mockStats) })
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

      // put out org in the body, 
      // as we don't have access to the request.organization prop in the tests
      res.end(JSON.stringify(req.organization))
    })
  })
}