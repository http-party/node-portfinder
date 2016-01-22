/*
 * portfinder-test.js: Tests for the `portfinder` module.
 *
 * (C) 2011, Charlie Robbins
 *
 */

var vows = require('vows'),
    assert = require('assert'),
    portfinder = require('../lib/portfinder'),
    testHelper = require('./helper');

var servers = [];

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
        "should respond with the first free port (8005)": function (err, port) {
          assert.isTrue(!err);
          assert.equal(port, 8005);
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
      "the getPort() method": {
        topic: function () {
          portfinder.getPort(this.callback);
        },
        "should respond with the first free port (8000)": function (err, port) {
          assert.isTrue(!err);
          assert.equal(port, 8000);
        }
      }
    }
  }
}).export(module);
