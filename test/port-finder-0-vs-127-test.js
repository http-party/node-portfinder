/*
 * port-finder-0-vs-127-test.js: Test for the `portfinder` module.
 * that demonstrates issue #24 
 * https://github.com/indexzero/node-portfinder/issues/24
 */

var vows = require('vows'),
    assert = require('assert'),
    portfinder = require('../lib/portfinder'),
    child_process = require('child_process'),
    path = require('path'),
    http = require('http');

const host = "localhost";
var server;

vows.describe('portfinder').addBatch({
  "When using portfinder module": {
    "ensure that infinite loop is not triggered": {
      topic: function () {
    var callback = this.callback;
    portfinder.getPort(function(err, port) {
      server = http.createServer(function(){}).listen(port, host, function() {
        var timeout = false;
        var fileToExec = path.join(__dirname, 'getPort.js');
        var timer = setTimeout(function() {
          timeout = true;
          process.kill(child.pid);
          callback(null, "timeout");  
        }, 10000); // 10 seconds
        var child = child_process.spawn('node', [fileToExec,  port]);
        child.on('close', function() {
          if (timeout === false) {
            clearTimeout(timer);
            callback(null);
          }
        });
      });  
    });
      },
      "should not get a timeout": function (err, res) {
        server.close();
        assert.isFalse(!!res);
      }
    }
  }
}).export(module);
