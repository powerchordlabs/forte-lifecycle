var rewire = require('rewire')
var forteLifecycle = rewire('../src')
var assert = require('chai').assert
var http = require('http')
var request = require('supertest')
var mockApi = require('./mocks/api')
var sinon = require('sinon')

// we create this module level variable becuase the code under test news up StatsD
// when it does we need to spy on the new instance...
var _mockStats

// rewire the node-statsd module
forteLifecycle.__set__('StatsD', function(options){
    _mockStats = {
      histogram: function (name, value, tags) {
        // console.log("`dgram(${name}:${value}|h|#url:${tags.url}`")
      }
    }
    
    // spy on the new instance...
    sinon.spy(_mockStats, 'histogram')
    
    return _mockStats
})

describe('forteLifecycle', function(){

  it('should throw an error when config is invalid', function(){
    var invalidConfigs = [
      undefined,
      null,
      {},
      { organizations: function(){}},
      { organizations: {}},
      { organizations: { getMany: {} }}
      //{ organizations: { getMany: {}, getOne: {} }},
      //{ organizations: { getMany: function(){}, getOne: {} }},
    ]
    invalidConfigs.forEach(function(config){
      assert.throws(function(){ forteLifecycle(config) })
    })
  })

  var server 
  var _mockApi
  var config = {}
  
  before(function(){
    _mockApi = mockApi({latency: 0})

    sinon.spy(_mockApi.organizations, 'getMany')
    //sinon.spy(_mockApi.organizations, 'getOne')

    server = createServer(forteLifecycle(_mockApi, { lookupDelay: 0 }))
  })

  function assertTrackedRenderTime() {
    function lastCall(){
      var args = _mockStats.histogram.lastCall.args;
      assert.equal(args.length, 3)

      return { name: args[0], value: args[1], tags: args[2] }
    }
    
    describe('server.renderTime', function(){
      it('should be logged via stats.histogram', function(){
        var last = lastCall()
        assert.equal(last.name, 'server.renderTime')
      })

      it('should have a numeric value', function(){
        var last = lastCall()
        assert.isNumber(last.value, 'histogram.value')
      })

      it('should have a url tag', function(){
        var last = lastCall()
        assert.match(last.tags[0], /url\:[\w\.]+\/.*/, 'histogram.tags url')
      })

      it('should have a statusCode tag', function(){
        var last = lastCall()
        assert.match(last.tags[1], /statusCode\:\d*/, 'histogram.tags statusCode')
      })
    })
  }

  describe('when the first request is received', function(){ 
    it('the organization cache shoud be populated', function(done){
      request(server)
        .get('/')
        .set('host', 'ladds')
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          assert(_mockApi.organizations.getMany.calledOnce)
          done()
        })
    })

    assertTrackedRenderTime()
  })

  describe('when a request has a VALID hostname', function(){
    describe('and hostname IS cached', function(){    
      it('request should have a lifecycle.scope property', function(done){
        request(server)
          .get('/')
          .set('host', 'ladds')
          .expect(200, '{"hostname":"ladds","trunk":"clubcar","branch":"ladds"}', done)
      })

      assertTrackedRenderTime()
    })

    describe.skip('and hostname IS NOT cached', function(){
      it('request should have a lifecycle.scope property', function(done){
        request(server)
          .get('/')
          .set('host', 'newbranch')
          .expect(200, '{"hostname":"newbranch","trunk":"clubcar","branch":"newbranch"}', done)
      })

      assertTrackedRenderTime()
    })

  })

  describe('when a request has an INVALID hostname', function(){
    it.skip('should return a 404 status', function(done){
      request(server)
        .get('/')
        .set('host', 'INVALID')
        .expect(404, done)
    })

    //assertTrackedRenderTime()

    describe('and lookupDelay is in play', function(){
      beforeEach(function(){
        server = createServer(forteLifecycle(_mockApi, { lookupDelay: 60 }))
      })
      it.skip('should return a 404 status', function(done){
        request(server)
          .get('/')
          .set('host', 'INVALID')
          .expect(404, done)
      })

      //assertTrackedRenderTime()
    })
  })
})

function createServer(middleware) {
  return http.createServer(function(req, res){
    middleware(req, res, function(err){
      // note: does not throw err, it returns an error response instead
      
      // typical express middleware testing pattern of 
      // outputting test results in the response
      res.end(JSON.stringify(req.lifecycle.scope))
    })
  })
}