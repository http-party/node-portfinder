var async = require('async'),
    http = require('http');


function createServer(host, base, next) {
  var server = http.createServer(function () {});

  if (!next) {
    server.listen({ host: host, port: base });
  } else {
    server.listen({ host: host, port: base }, next);
  }

  return server;
}

module.exports = function(servers, callback) {
  var base = 8000;

  async.whilst(
    function () { return base < 8005; },
    function (next) {
      var hosts = ['127.0.0.1', '0.0.0.0', '::1'];
      while (hosts.length > 1) { servers.push(createServer(hosts.shift(), base)); }
      servers.push(createServer(hosts.shift(), base, next)); // call next for host
      base++;
    }, callback);
};
