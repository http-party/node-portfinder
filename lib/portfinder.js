/*
 * portfinder.js: A simple tool to find an open port on the current machine.
 *
 * (C) 2011, Charlie Robbins
 *
 */
 
var fs = require('fs'),
    http = require('http'),
    net = require('net'),
    path = require('path'),
    mkdirp = require('mkdirp').mkdirp;

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
  
  options.port   = options.port   || exports.basePort;
  options.host   = options.host   || null;
  options.server = options.server || http.createServer(function () {
    //
    // Create an empty listener for the port testing server.
    //
  });
  
  function onListen () {
    options.server.removeListener('error', onError);
    options.server.close();
    callback(null, options.port)
  }
  
  function onError (err) {
    options.server.removeListener('listening', onListen);

    if (err.code !== 'EADDRINUSE') {
      return callback(err);
    }

    exports.getPort({
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

  var socket   = new net.Socket();
  options.mod  = options.mod    || 0755;
  options.path = options.path   || exports.basePath + '.sock';
  
  //
  // If an `ENOENT` or `ECONNREFUSED` error is emitted from
  // the socket then it is available.
  //
  function onError (err) {
    socket.removeListener('connect', onConnect);
    socket.destroy();

    return ~['ENOENT', 'ECONNREFUSED'].indexOf(err.code)
      ? callback(null, options.path)
      : callback(err);
  }
  
  //
  // If we are able to connect to the socket then it is 
  // not available and we should keep trying.
  //
  function onConnect () {
    socket.removeListener('error', onError);
    socket.destroy();

    options.path = exports.nextSocket(options.path);
    exports.getSocket(options, callback);
  }
  
  //
  // Tests the specified socket
  //
  function testSocket () {
    socket.once('error', onError);
    socket.once('connect', onConnect);
    socket.connect(options.path);
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