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
      "the getPort() method": {
        topic: function () {
          portfinder.getPort(this.callback);
        },
        "should respond with the first free port (32773)": function (err, port) {
          assert.isTrue(!err);
          assert.equal(port, 32773);
        }
      },
      "the getPort() method with user passed duplicate host": {
        topic: function () {
          portfinder.getPort({ host: '127.0.0.1' }, this.callback);
        },
        "should respond with the first free port (32774)": function (err, port) {
          assert.isTrue(!err);
          assert.equal(port, 32774);
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
        "should respond with the first free port (32768)": function (err, port) {
          assert.isTrue(!err);
          assert.equal(port, 32768);
        }
      }
    }
  }
}).export(module);
