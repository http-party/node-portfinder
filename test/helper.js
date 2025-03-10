"use strict";

const _async = require('async'),
      http = require('http');


function createServer(base, host, next) {
  const server = http.createServer(function () {});

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

module.exports.startServers = function(servers, startPort, endPort, callback) {
  if (typeof startPort === 'function') {
    // Make startPort & endPort optional
    callback = startPort;
    startPort = undefined;
  }

  let base = startPort || 32768;
  endPort = endPort || 32773;

  _async.whilst(
    function (cb) { cb(null, base < endPort); },
    function (next) {
      const hosts = ['localhost'];
      while (hosts.length > 1) { servers.push(createServer(base, hosts.shift())); }
      servers.push(createServer(base, hosts.shift(), next)); // call next for host
      base++;
    },
    callback,
  );
};

module.exports.stopServers = function(servers, callback) {
  _async.whilst(
    function(cb) { cb(null, servers.length > 0); },
    function(next) {
      servers.pop().close(next);
    },
    callback,
  );
}
