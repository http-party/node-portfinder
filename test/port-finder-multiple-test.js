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

vows.describe('portfinder').addBatch({
  "When using portfinder module": {
    "with 5 existing servers": {
      topic: function () {
        testHelper(servers, this.callback);
      },
      "the getPorts() method with an argument of 3": {
        topic: function () {
          portfinder.getPorts(3, this.callback);
        },
        "should respond with the first three available ports (32773, 32774, 32775)": function (err, ports) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.deepEqual(ports, [32773, 32774, 32775]);
        }
      }
    }
  }
}).addBatch({
  "When using portfinder module": {
    "with no existing servers": {
      topic: function () {
        servers.forEach(function (server) {
          server.close();
        });

        return null;
      },
      "the getPorts() method with an argument of 3": {
        topic: function () {
          portfinder.getPorts(3, this.callback);
        },
        "should respond with the first three available ports (32768, 32769, 32770)": function (err, ports) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.deepEqual(ports, [32768, 32769, 32770]);
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
      "the getPortPromises() method with an argument of 3": {
        topic: function () {
          var vow = this;

          portfinder.getPortsPromise(3)
            .then(function (ports) {
              vow.callback(null, ports);
            })
            .catch(function (err) {
              vow.callback(err, null);
            });
        },
        "should respond with the first three available ports (32768, 32769, 32770) if Promise are available": function (err, ports) {
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
          assert.deepEqual(ports, [32768, 32769, 32770]);
        }
      },
    }
  }
}).export(module);
