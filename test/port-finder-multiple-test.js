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
    testHelper = require('./helper');

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
          assert.isTrue(!err);
          assert.deepEqual(ports, [32768, 32769, 32770]);
        }
      }
    }
  }
}).export(module);
