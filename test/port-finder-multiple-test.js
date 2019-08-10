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
        "should respond with three distinct available ports (>= 32773)": function (err, ports) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          var seen = new Set()
          for (var port of ports) {
            assert.isFalse(seen.has(port))
            assert.isTrue(port >= 32773)
            seen.add(port)
          }
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
        "should respond with three distinct available ports (>= 32768)": function (err, ports) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          var seen = new Set()
          for (var port of ports) {
            assert.isFalse(seen.has(port))
            assert.isTrue(port >= 32773)
            seen.add(port)
          }
        }
      }
    }
  }
}).export(module);
