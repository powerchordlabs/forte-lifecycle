# forte-lifecycle [![Travis][build-badge]][build] [![npm package][npm-badge]][npm]

Forte Lifecycle is expressjs middleware that provides lifecycle magic to your Forte experience apps.

## Features

* **Automatic Organization Resolver and Cache**  
The first request processed will cause a `forte-api` call to be made that fills the organization cache. A request.organization prop will also be available for use in other areas of your express server.
* **Automatic server.renderTime metric tracking**  
All requests are timed and logged via [node-statsd](https://github.com/sivy/node-statsd)

## Install

`$ npm i -S forte-lifecycle`

## Documentation

* [Quick Start](#quick-start)
* [API](#api)
    * [Constructor](#constructor)
    * [Request Properties](#request-properties)

## Quick Start

``` js
var express = require('express')
var forteApi = require('forte-api')
var lifecycle = require('forte-lifecycle')

var app = express()

var api = forteApi({...})

// register the middleware
// be sure to register the middleware before any routes that require trunk/branch scope info
app.use(lifecycle(api)) 

// now, all requests will have a request.lifecycle property
// and log server.renderTime using node-statsd
app.get('/', function (req, res) {
  res.send('Hello ' + req.lifecycle.scope.trunk '!');
});

app.listen(3000, function () {  
  console.log('Forte Experience app listening on port 3000!');
})
```

## API

### Constructor

#### ForteLifecycle(apiClient, [options])
Creates an instance of the Forte Lifecycle middleware.

* `apiClient: {Object}`  
A `forte-api` client instance or an object that conforms to the following interface can also be supplied:
    * `organizations.getOne(filter): {organization}`  
    Returns a promise that returns a single organization. `filter` is an object map of props to filter by e.x.: `{ hostname: '...'}`.
    * `organizations.getMany(filter): [{organization}, ...]`  
    Returns a promise that returns all organizations. `filter` is an object map of props to filter by e.x.: `{ parentID: '...'}`. 
* `options: {Object}`
    * `lookupDelay: {number}`  
    The number of seconds to wait before calling the API to lookup an un-cached hostname. Useful to prevent multiple api calls for invalid/inactive hostnames.  
    `default: 60`
    * `stats: {Object}`  
    An optional configuration object for `node-statsd`.  
    `default: node-statsd defaults` see [node-statsd usage](https://github.com/sivy/node-statsd#usage)

### Request Properties

The lifecycle middleware adds the following properties to the request for use in subsequent middleware/handlers:

#### request.lifecycle.scope: {object}

* `hostname: {string}`
The hostname of the request derived from `request.headers.host`.
* `trunk: {string}`  
The trunk organization ID for the request.
* `branch: {string}`  
The branch organization ID for the request.


[build-badge]: https://img.shields.io/travis/powerchordlabs/forte-lifecycle/master.svg?style=flat-square
[build]: https://travis-ci.org/powerchordlabs/forte-lifecycle

[npm-badge]: https://img.shields.io/npm/v/forte-lifecycle.svg?style=flat-square
[npm]: https://www.npmjs.org/package/forte-lifecycle
