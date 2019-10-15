"use strict";

var _async = require('async'),
    http = require('http');


function createServer(base, host, next) {
  var server = http.createServer(function () {});

  if (!next) {
    server.listen(base, host);
  } else {
    server.listen(base, host, next);
  }

  server.on('error', function() {
    server.close();
  });

  return server;
}

module.exports = function(servers, startPort, endPort, callback) {
  if (typeof startPort === 'function') {
    // Make startPort & endPort optional
    callback = startPort;
    startPort = undefined;
  }

  var base = startPort || 32768;
  endPort = endPort || 32773;

  _async.whilst(
    function () { return base < endPort; },
    function (next) {
      var hosts = ['localhost'];
      while (hosts.length > 1) { servers.push(createServer(base, hosts.shift())); }
      servers.push(createServer(base, hosts.shift(), next)); // call next for host
      base++;
    }, callback);
};
