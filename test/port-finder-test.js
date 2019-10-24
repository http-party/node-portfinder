/*
 * portfinder-test.js: Tests for the `portfinder` module.
 *
 * (C) 2011, Charlie Robbins
 *
 */

"use strict";

var vows = require('vows'),
    assert = require('assert'),
    portfinder = require('../lib/portfinder'),
    testHelper = require('./helper'),
    debug = require('debug');

var debugVows = debug('portfinder:testVows');

portfinder.basePort = 32768;

var servers = [];

var closeServers = function () {
  servers.forEach(function (server) {
    server.close();
  });
  servers = []
}

vows.describe('portfinder').addBatch({
  "When using portfinder module": {
    "with 5 existing servers": {
      topic: function () {
        testHelper(servers, this.callback);
      },
      "the getPort() method": {
        topic: function () {
          portfinder.getPort(this.callback);
        },
        "should respond with the first free port (32773)": function (err, port) {
          closeServers(); // close all the servers first!

          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.equal(port, 32773);
        }
      },
    }
  }
}).addBatch({
  "When using portfinder module": {
    "with 5 existing servers": {
      topic: function () {
        testHelper(servers, this.callback);
      },
      "the getPort() method with user passed duplicate host": {
        topic: function () {
          portfinder.getPort({ host: 'localhost' }, this.callback);
        },
        "should respond with the first free port (32773)": function (err, port) {
          closeServers(); // close all the servers first!

          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.equal(port, 32773);
        }
      },
    }
  }
}).addBatch({
  "When using portfinder module": {
    "with 5 existing servers": {
      topic: function () {
        testHelper(servers, this.callback);
      },
      "the getPort() method with stopPort smaller than available port": {
        topic: function () {
          // stopPort: 32722 is smaller than available port 32773 (32768 + 5)
          portfinder.getPort({ stopPort: 32772 }, this.callback);
        },
        "should return error": function(err, port) {
          closeServers() // close all the servers first!

          assert.isTrue(!!err);
          assert.equal(
            err.message,
            'No open ports found in between 32768 and 32772'
          );
          return;
        }
      },
    }
  }
}).addBatch({
  "When using portfinder module": {
    "with 5 existing servers": {
      topic: function () {
        testHelper(servers, this.callback);
      },
      "the getPort() method with stopPort greater than available port": {
        topic: function () {
          // stopPort: 32774 is greater than available port 32773 (32768 + 5)
          portfinder.getPort({ stopPort: 32774 }, this.callback);
        },
        "should respond with the first free port (32773) less than provided stopPort": function(err, port) {
          closeServers() // close all the servers first!

          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.equal(port, 32773);
        }
      },
    }
  }
}).addBatch({
  "When using portfinder module": {
    "with no existing servers": {
      topic: function () {
        closeServers();
        return null;
      },
      "the getPort() method": {
        topic: function () {
          portfinder.getPort(this.callback);
        },
        "should respond with the first free port (32768)": function (err, port) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.equal(port, 32768);
        }
      }
    }
  }
}).addBatch({
  "When using portfinder module": {
    "with no existing servers": {
      topic: function () {
        closeServers();
        return null;
      },
      "the getPortPromise() method": {
        topic: function () {
          var vow = this;

          portfinder.getPortPromise()
            .then(function (port) {
              vow.callback(null, port);
            })
            .catch(function (err) {
              vow.callback(err, null);
            });
        },
        "should respond with a promise of first free port (32768) if Promise are available": function (err, port) {
          if (typeof Promise !== 'function') {
            assert.isTrue(!!err);
            assert.equal(
              err.message,
              'Native promise support is not available in this version of node.' +
              'Please install a polyfill and assign Promise to global.Promise before calling this method'
            );
            return;
          }
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.equal(port, 32768);
        }
      },
    }
  }
}).addBatch({
  "When using portfinder module": {
    // regression test for http-party/node-portfinder#65
    "the getPort() method with startPort less than or equal to 80": {
      topic: function () {
        portfinder.getPort({startPort: 80}, this.callback);
      },
      "should not throw any error.": function(err, port) {
        if (err) { debugVows(err); }
        assert.isTrue(!err);
      }
    }
  }
}).addBatch({
  "When using portfinder module": {
    "with no available ports above the start port": {
      topic: function () {
        testHelper(servers, 65530, 65536, this.callback);
      },
      "the getPort() method requesting an unavailable port": {
        topic: function () {
          portfinder.getPort({ port: 65530 }, this.callback);
        },
        "should return error": function(err, port) {
          closeServers() // close all the servers first!

          assert.isTrue(!!err);
          assert.equal(
            err.message,
            'No open ports available'
          );
          return;
        }
      },
    }
  }
})

.export(module);
