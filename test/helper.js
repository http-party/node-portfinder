"use strict";

var async = require('async'),
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

module.exports = function(servers, callback) {
  var base = 32768;

  async.whilst(
    function () { return base < 32773; },
    function (next) {
      var hosts = ['127.0.0.1', '0.0.0.0', '::1'];
      while (hosts.length > 1) { servers.push(createServer(base, hosts.shift())); }
      servers.push(createServer(base, hosts.shift(), next)); // call next for host
      base++;
    }, callback);
};
