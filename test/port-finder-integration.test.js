/*
 * port-finder-0-vs-127-test.js: Test for the `portfinder` module.
 * that demonstrates issue #24
 * https://github.com/http-party/node-portfinder/issues/24
 */


var portfinder = require('../lib/portfinder'),
    child_process = require('child_process'),
    path = require('path'),
    http = require('http');

const host = "localhost";
var server;

describe('portfinder', function () {
  afterAll(function (done) {
    if (server) {
      server.close(done);
    }
  });

  test('ensure that infinite loop is not triggered', function (done) {
    portfinder.getPort(function (err, port) {
      expect(err).toBeNull();
      server = http.createServer(function () {}).listen(port, host, function () {
        var timeout = false;
        var fileToExec = path.join(__dirname, 'getPort.js');
        var timer = setTimeout(function () {
          timeout = true;
          process.kill(child.pid);
          done("timeout");
        }, 10000); // 10 seconds
        var child = child_process.spawn('node', [fileToExec, port]);
        child.on('close', function () {
          if (timeout === false) {
            clearTimeout(timer);
            done();
          }
        });
      });
    });
  }, 12000);
});
