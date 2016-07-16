/*
 * portfinder.js: A simple tool to find an open port on the current machine.
 *
 * (C) 2011, Charlie Robbins
 *
 */

"use strict";

var fs = require('fs'),
    net = require('net'),
    path = require('path'),
    async = require('async'),
    mkdirp = require('mkdirp').mkdirp;

var internals = {};

internals.testPort = function(options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }

  options.port   = options.port   || exports.basePort;
  options.host   = options.host   || null;
  options.server = options.server || net.createServer(function () {
    //
    // Create an empty listener for the port testing server.
    //
  });

  function onListen () {
    options.server.removeListener('error', onError);
    options.server.close();
    callback(null, options.port);
  }

  function onError (err) {
    options.server.removeListener('listening', onListen);

    if (err.code !== 'EADDRINUSE' && err.code !== 'EACCES') {
      return callback(err);
    }

    internals.testPort({
      port: exports.nextPort(options.port),
      host: options.host,
      server: options.server
    }, callback);
  }

  options.server.once('error', onError);
  options.server.once('listening', onListen);
  options.server.listen(options.port, options.host);
};

//
// ### @basePort {Number}
// The lowest port to begin any port search from
//
exports.basePort = 8000;

//
// ### @basePath {string}
// Default path to begin any socket search from
//
exports.basePath = '/tmp/portfinder'

//
// ### function getPort (options, callback)
// #### @options {Object} Settings to use when finding the necessary port
// #### @callback {function} Continuation to respond to when complete.
// Responds with a unbound port on the current machine.
//

var defaultHosts = ['::1', '127.0.0.1', '0.0.0.0'];
exports.getPort = function (options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }

  if (options.host) {

    var hasUserGivenHost;
    for (var i = 0; i < defaultHosts.length; i++) {
      if (defaultHosts[i] === options.host) {
        hasUserGivenHost = true;
        break;
      }
    }

    if (!hasUserGivenHost) {
      defaultHosts.push(options.host);
    }

  }

  var openPorts = [];
  return async.eachSeries(defaultHosts, function(host, next) {
    return internals.testPort({ host: host, port: options.port }, function(err, port) {
      if (err) {
        return next(err);
      } else {
        openPorts.push(port);
        return next();
      }
    });
  }, function(err) {
    if (err) {
      if (err.address && net.isIPv6(err.address)) {
        if (options.host && net.isIPv6(options.host)) {
          // let user know if they provided an ipv6 host, bail
          var msg = 'Provided host ' + options.host +
                    ' is ipv6 and your system does not support it.'+
                    ' Please provide a host that is ipv4';
          return callback(Error(msg));
        } else {
          // filter our defaultHosts to only be ipv4, start over
          defaultHosts = defaultHosts.filter(function(_host) {
            return net.isIPv4(_host);
          });
          return exports.getPort(options, callback);
        }
      } else {
        // error is not ipv6 related, file ticket, handle as special case
        return callback(err);
      }
    }

    // sort so we can compare first host to last host
    openPorts.sort(function(a, b) {
      return a - b;
    });

    if (openPorts[0] === openPorts[openPorts.length-1]) {
      // if first === last, we found an open port
      return callback(null, openPorts[0]);
    } else {
      // otherwise, try again, using sorted port, aka, highest open for >= 1 host
      return exports.getPort({ port: openPorts.pop(), host: options.host }, callback);
    }

  });
};

//
// ### function getPorts (count, options, callback)
// #### @count {Number} The number of ports to find
// #### @options {Object} Settings to use when finding the necessary port
// #### @callback {function} Continuation to respond to when complete.
// Responds with an array of unbound ports on the current machine.
//
exports.getPorts = function (count, options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }

  var lastPort = null;
  async.timesSeries(count, function(index, asyncCallback) {
    if (lastPort) {
      options.port = exports.nextPort(lastPort);
    }

    exports.getPort(options, function (err, port) {
      if (err) {
        asyncCallback(err);
      } else {
        lastPort = port;
        asyncCallback(null, port);
      }
    });
  }, callback);
};

//
// ### function getSocket (options, callback)
// #### @options {Object} Settings to use when finding the necessary port
// #### @callback {function} Continuation to respond to when complete.
// Responds with a unbound socket using the specified directory and base
// name on the current machine.
//
exports.getSocket = function (options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }

  options.mod  = options.mod    || parseInt(755, 8);
  options.path = options.path   || exports.basePath + '.sock';

  //
  // Tests the specified socket
  //
  function testSocket () {
    fs.stat(options.path, function (err) {
      //
      // If file we're checking doesn't exist (thus, stating it emits ENOENT),
      // we should be OK with listening on this socket.
      //
      if (err) {
        if (err.code == 'ENOENT') {
          callback(null, options.path);
        }
        else {
          callback(err);
        }
      }
      else {
        //
        // This file exists, so it isn't possible to listen on it. Lets try
        // next socket.
        //
        options.path = exports.nextSocket(options.path);
        exports.getSocket(options, callback);
      }
    });
  }

  //
  // Create the target `dir` then test connection
  // against the socket.
  //
  function createAndTestSocket (dir) {
    mkdirp(dir, options.mod, function (err) {
      if (err) {
        return callback(err);
      }

      options.exists = true;
      testSocket();
    });
  }

  //
  // Check if the parent directory of the target
  // socket path exists. If it does, test connection
  // against the socket. Otherwise, create the directory
  // then test connection.
  //
  function checkAndTestSocket () {
    var dir = path.dirname(options.path);

    fs.stat(dir, function (err, stats) {
      if (err || !stats.isDirectory()) {
        return createAndTestSocket(dir);
      }

      options.exists = true;
      testSocket();
    });
  }

  //
  // If it has been explicitly stated that the
  // target `options.path` already exists, then
  // simply test the socket.
  //
  return options.exists
    ? testSocket()
    : checkAndTestSocket();
};

//
// ### function nextPort (port)
// #### @port {Number} Port to increment from.
// Gets the next port in sequence from the
// specified `port`.
//
exports.nextPort = function (port) {
  return port + 1;
};

//
// ### function nextSocket (socketPath)
// #### @socketPath {string} Path to increment from
// Gets the next socket path in sequence from the
// specified `socketPath`.
//
exports.nextSocket = function (socketPath) {
  var dir = path.dirname(socketPath),
      name = path.basename(socketPath, '.sock'),
      match = name.match(/^([a-zA-z]+)(\d*)$/i),
      index = parseInt(match[2]),
      base = match[1];

  if (isNaN(index)) {
    index = 0;
  }

  index += 1;
  return path.join(dir, base + index + '.sock');
};
