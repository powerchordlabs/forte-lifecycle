# forte-server

TODO: build this readme

### original notes
* manage org tree variable injection
    * create a mapping of subdomain => org in memory as requests come in
    * injects org props in to POWERCHORD global in html
* calls stats.histogram with render.duration metric
* adapters for express
    * handle hooks for render start/end events
    * track render time using:
        * stats.timing(‘render.duration’, time() - startTime) // in ms