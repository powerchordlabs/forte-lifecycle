var forteLifecycle = require('../lib/')
var assert = require('assert')
var http = require('http')
var request = require('supertest')
var mockApi = require('./mocks/api')

describe('forteLifecycle()', function(){
  var server
  var _forteLifecycle = forteLifecycle(mockApi)

  before(function(){
    server = createServer(_forteLifecycle)
  })

  describe('when a request is processed with an invalid hostname', function(){
    it('should return an error statusCode', function(done){
      request(server)
      .get('/')
      .set('host', 'INVALID')
      .expect(500, 'Unkown Organization', done)
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

  describe('when a request is processed with a valid hostname', function(){
    it('should have a request.organization property', function(done){
      request(server)
      .get('/')
      .set('host', 'ladds')
      .expect(200, '{"ID":"ladds","parentID":"clubcar"}', done)
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