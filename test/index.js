var rewire = require('rewire')
var forteLifecycle = rewire('../src')
var assert = require('chai').assert
var http = require('http')
var request = require('supertest')
var mockApi = require('./mocks/api')
var sinon = require('sinon')

// rewire the node-statsd module
forteLifecycle.__set__('stats', {
    histogram: function (name, value, tags) {
      // console.log(`dgram(${name}:${value}|h|#url:${tags.url}`)
    }
})

describe('forteLifecycle', function(){

  it('should throw an error when config is invalid', function(){
    var invalidConfigs = [
      undefined,
      null,
      {},
      { organizations: function(){}},
      { organizations: {}},
      { organizations: { getMany: {}, getOne: {} }},
      { organizations: { getMany: function(){}, getOne: {} }},
    ]
    invalidConfigs.forEach(function(config){
      assert.throws(function(){ forteLifecycle(config) })
    })
  })

  var server 
  var _mockApi
  var _mockStats
  var config = {}
  
  before(function(){
    _mockApi = mockApi({latency: 0})
    _mockStats = forteLifecycle.__get__('stats')

    sinon.spy(_mockApi.organizations, 'getMany')
    sinon.spy(_mockApi.organizations, 'getOne')
    sinon.spy(_mockStats, 'histogram')

  })

  beforeEach(function(){
    server = createServer(forteLifecycle(_mockApi, { lookupDelay: 0 }))
  })

  function assertTrackedRenderTime() {
      it('server.renderTime should be logged via stats.histogram', function(done){
        //console.log('_mockStats.histogram.callCount:', _mockStats.histogram.callCount)
        var args = _mockStats.histogram.lastCall.args;
        assert.equal(args.length, 3)

        var name  = args[0],
            value = args[1],
            tags  = args[2];

        assert.equal(name, 'server.renderTime')
        assert.isNumber(value, 'histogram.value')
        assert.isObject(tags, 'histogram.tags')
        assert.isDefined(tags.url, 'histogram.tags.url')

        done()
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
          .expect(200, '{"trunk":"clubcar","branch":"ladds"}', done)
      })

      assertTrackedRenderTime()
    })

    describe('and hostname IS NOT cached', function(){
      it('request should have a lifecycle.scope property', function(done){
        request(server)
          .get('/')
          .set('host', 'newbranch')
          .expect(200, '{"trunk":"clubcar","branch":"newbranch"}', done)
      })

      assertTrackedRenderTime()
    })

  })

  describe('when a request has an INVALID hostname', function(){
    it('should return a 404 status', function(done){
      request(server)
        .get('/')
        .set('host', 'INVALID')
        .expect(404, done)
    })

    assertTrackedRenderTime()

    describe('and lookupDelay is in play', function(){
      beforeEach(function(){
        server = createServer(forteLifecycle(_mockApi, { lookupDelay: 60 }))
      })
      it('should return a 404 status', function(done){
        request(server)
          .get('/')
          .set('host', 'INVALID')
          .expect(404, done)
      })

      assertTrackedRenderTime()
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