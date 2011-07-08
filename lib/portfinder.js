/*
 * portfinder.js: A simple tool to find an open port on the current machine.
 *
 * (C) 2011, Charlie Robbins
 *
 */
 
var http = require('http');

exports.basePort = 8000;

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

exports.nextPort = function (port) {
  return port + 1;
};