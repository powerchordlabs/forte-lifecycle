# forte-lifecycle

Forte Lifecycle is expressjs middleware that provides lifecycle magic to your Forte experience apps.

## Features

* **Automatic Organization Resolver and Cache**  
The first request processed will cause a `forte-api` call to be made that fills the organization cache. A request.organization prop will also be available for use in other areas of your express server.
* **Automatic server.renderTime metric tracking**  
All requests are timed and logged via [node-statsd](https://github.com/sivy/node-statsd)

## Install

`$ npm i -S forte-lifecycle`

## Usage

``` js
var express = require('express')
var forteApi = require('forte-api')
var lifecycle = require('forte-lifecycle')

var app = express()

var api = forteApi({...})

// register the middleware
// be sure to register the middleware before any routes that require organization info
app.use(lifecycle(api)) 

// now, all requests will have a request.organization property
// and log server.renderTime using node-statsd
app.get('/', function (req, res) {
  res.send('Hello ' + req.organization.name '!');
});

app.listen(3000, function () {  
  console.log('Forte Experience app listening on port 3000!');
})
```

## API

### Constructor

#### ForteLifecycle(apiClient, [statsdConfig])
Creates an instance of the Forte Lifecycle middleware.

* `apiClient: object`  
A `forte-api` client instance or an object that conforms to the following interface can also be supplied:
    * `organization.get: function(filter)`  
    Returns a promise that returns a single organization. `filter` is an object map of props to filter by e.x.: `{ hostname: '...'}`.
    * `organizations.get: function(filter)`  
    Returns a promise that returns all organizations. `filter` is an object map of props to filter by e.x.: `{ parentID: '...'}`. 
* `statsdConfig: object`  
An optional configuration object for `node-statsd`. See [node-statsd usage](https://github.com/sivy/node-statsd#usage)
