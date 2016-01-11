# forte-lifecycle

Forte Lifecycle is expressjs middleware that provides lifecycle magic to your Forte experience apps.

## Features

* **Automatic Organization Resolver and Cache**  
The first request processed will cause a `forte-api` call to be made that fills the organization cache. A request.organization prop will also be available for use in other areas of your express server.
* **Automatic server.renderTime metric tracking**  
All requests are timed and logged to the PowerChorc platform via `forte-stats`

## Install

`$ npm i -S forte-lifecycle`

## Usage

``` js
var express = require('express')
var api = require('forte-api')
var stats = require('forte-stats')
var lifecycle = require('forte-lifecycle')

var app = express()

var apiClient = api({...})
var statsClient = stats({...})
var apiClient = api({...})

// register the middleware
// be sure to register the middleware before any routes that require organization info
app.use(lifecycle({ apiClient, statsClient })) 

// now, all requests will have a request.organization property
// and log server.renderTime to the PowerChord platform
app.get('/', function (req, res) {
  res.send('Hello ' + req.organization.name '!');
});

app.listen(3000, function () {  
  console.log('Forte Experience app listening on port 3000!');
})
```

## API

### Constructor

#### ForteLifecycle(config)
Creates an instance of the Forte Lifecycle middleware.

* `apiClient: object`  
A `forte-api` client instance or an object that conforms to the following interface can also be supplied:
    * `organization.get: function(filter)`  
    Returns a promise that returns a single organization. `filter` is an object map of props to filter by e.x.: `{ hostname: '...'}`.
    * `organizations.get: function(filter)`  
    Returns a promise that returns all organizations. `filter` is an object map of props to filter by e.x.: `{ parentID: '...'}`.
* `statsClient: object`  
A `forte-stats` client instance or an object that conforms to the following interface:
    * `histogram: function(name, value, tags)`  