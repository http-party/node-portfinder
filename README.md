# node-portfinder

[![CI](https://github.com/http-party/node-portfinder/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/http-party/node-portfinder/actions/workflows/ci.yml)

## Installation

You can install `portfinder` using a package manager like npm, yarn, or bun:

``` bash
npm install portfinder
```

## Usage
The `portfinder` module has a simple interface:

``` js
const portfinder = require('portfinder');

portfinder.getPort(function (err, port) {
  //
  // `port` is guaranteed to be a free port
  // in this scope.
  //
});
```

Or using promises:

``` js
const portfinder = require('portfinder');

portfinder.getPortPromise()
  .then((port) => {
    //
    // `port` is guaranteed to be a free port
    // in this scope.
    //
  })
  .catch((err) => {
    //
    // Could not get a free port, `err` contains the reason.
    //
  });
```

### Ports search scope

By default `portfinder` will start searching from `8000` and scan until maximum port number (`65535`) is reached.

You can change this globally by setting:

```js
portfinder.setBasePort(3000);    // default: 8000
portfinder.setHighestPort(3333); // default: 65535
```

or by passing optional options object on each invocation:

```js
portfinder.getPort({
  port: 3000,    // minimum port
  stopPort: 3333 // maximum port
}, callback);
```

## Run Tests
``` bash
npm test
```

#### Author: [Charlie Robbins][0]
#### Author/Maintainer: [Erik Trom][1]
#### License: MIT/X11
[0]: http://nodejitsu.com
[1]: https://github.com/eriktrom
