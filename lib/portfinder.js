/*
 * portfinder.js: A simple tool to find an open port on the current machine.
 *
 * (C) 2011, Charlie Robbins
 *
 */

"use strict";

var fs = require('fs'),
    os = require('os'),
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
exports.getPort = function (options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }

  if (options.host) {

    var hasUserGivenHost;
    for (var i = 0; i < exports._defaultHosts.length; i++) {
      if (exports._defaultHosts[i] === options.host) {
        hasUserGivenHost = true;
        break;
      }
    }

    if (!hasUserGivenHost) {
      exports._defaultHosts.push(options.host);
    }

  }

  var openPorts = [];
  return async.eachSeries(exports._defaultHosts, function(host, next) {
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

      // Handle MacOS 10.11.5+ interface changes and running portfinder from
      // within the same netmask, including from within a locally running VM.
      if (err.code === 'EADDRNOTAVAIL') {
        var idx = exports._defaultHosts.indexOf(err.address);
        exports._defaultHosts.splice(idx, 1);
      }

      // NOTE: net.isIPv6(err.address) check is likely === EADDRNOTAVAIL check above
      // Refactor when patience is high and risk seems like fun. Really, just leave it.
      if (err.address && net.isIPv6(err.address)) {
        if (options.host && net.isIPv6(options.host)) {
          // let user know if they provided an ipv6 host, bail
          var msg = 'Provided host ' + options.host +
                    ' is ipv6 and your system does not support it.'+
                    ' Please provide a host that is ipv4';
          return callback(Error(msg));
        } else {
          // filter our defaultHosts to only be ipv4, start over
          exports._defaultHosts = exports._defaultHosts.filter(function(_host) {
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

/**
 * @desc List of internal hostnames provided by your machine. A user
 *       provided hostname may also be provided when calling portfinder.getPort,
 *       which would then be added to the default hosts we lookup and return here.
 *
 * @return {array}
 *
 * Long Form Explantion:
 *
 *    - Input: (os.networkInterfaces() w/ MacOS 10.11.5+ and running a VM)
 *
 *        { lo0:
 *         [ { address: '::1',
 *             netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
 *             family: 'IPv6',
 *             mac: '00:00:00:00:00:00',
 *             scopeid: 0,
 *             internal: true },
 *           { address: '127.0.0.1',
 *             netmask: '255.0.0.0',
 *             family: 'IPv4',
 *             mac: '00:00:00:00:00:00',
 *             internal: true },
 *           { address: 'fe80::1',
 *             netmask: 'ffff:ffff:ffff:ffff::',
 *             family: 'IPv6',
 *             mac: '00:00:00:00:00:00',
 *             scopeid: 1,
 *             internal: true } ],
 *        en0:
 *         [ { address: 'fe80::a299:9bff:fe17:766d',
 *             netmask: 'ffff:ffff:ffff:ffff::',
 *             family: 'IPv6',
 *             mac: 'a0:99:9b:17:76:6d',
 *             scopeid: 4,
 *             internal: false },
 *           { address: '10.0.1.22',
 *             netmask: '255.255.255.0',
 *             family: 'IPv4',
 *             mac: 'a0:99:9b:17:76:6d',
 *             internal: false } ],
 *        awdl0:
 *         [ { address: 'fe80::48a8:37ff:fe34:aaef',
 *             netmask: 'ffff:ffff:ffff:ffff::',
 *             family: 'IPv6',
 *             mac: '4a:a8:37:34:aa:ef',
 *             scopeid: 8,
 *             internal: false } ],
 *        vnic0:
 *         [ { address: '10.211.55.2',
 *             netmask: '255.255.255.0',
 *             family: 'IPv4',
 *             mac: '00:1c:42:00:00:08',
 *             internal: false } ],
 *        vnic1:
 *         [ { address: '10.37.129.2',
 *             netmask: '255.255.255.0',
 *             family: 'IPv4',
 *             mac: '00:1c:42:00:00:09',
 *             internal: false } ] }
 *
 *    - Output:
 *
 *         [
 *          '0.0.0.0',
 *          '::1',
 *          '127.0.0.1',
 *          '10.0.1.22',
 *          '10.211.55.2',
 *          '10.37.129.2'
 *         ]
 *
 *     Note we export this so we can use it in our tests, otherwise this API is private
 *     Also, do not clone the object or its props, we depend on it being a mutable reference.
 */
exports._defaultHosts = (function() {
  var interfaces = os.networkInterfaces(),
      interfaceNames = Object.keys(os.networkInterfaces()),
      hiddenButImportantHost = '0.0.0.0', // !important - dont remove, hence the naming :)
      results = [hiddenButImportantHost];
  for (var i = 0; i < interfaceNames.length; i++) {
    var _interface = interfaces[interfaceNames[i]];
    for (var j = 0; j < _interface.length; j++) {
      var curr = _interface[j];
      if (curr.internal || curr.netmask === '255.255.255.0') {
        results.push(curr.address);
      }
    }
  }
  return results;
}());
