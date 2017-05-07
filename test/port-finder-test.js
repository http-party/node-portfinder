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
var waitTime = 3000; // wait for cleanup of bound hosts

vows.describe('portfinder')
.addBatch({
  "When using portfinder module": {
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
}).addBatch({
  "When using portfinder module": {
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
    }
  }
})
.addBatch({
  "When using portfinder module": {
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
})
.addBatch({
  "When using portfinder module": {
    "with 5 existing servers": {
      topic: function () {
        setTimeout(function() {
          testHelper(servers, this.callback);
        }.bind(this), waitTime);
      },
      "the getPort() method": {
        topic: function () {
          portfinder.getPort(this.callback);
        },
        "should respond with the first free port (32773)": function (err, port) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.equal(port, 32773);
        }
      },
      "the getPort() method with user passed duplicate host": {
        topic: function () {
          setTimeout(function() {
            portfinder.getPort({ host: 'localhost' }, this.callback);
          }.bind(this), waitTime);
        },
        "should respond with the first free port (32773)": function (err, port) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.equal(port, 32773);
        }
      },
      "the getPorts() method with an argument of 3": {
        topic: function () {
          setTimeout(function() {
            portfinder.getPorts(3, this.callback);
          }.bind(this), waitTime*2);
        },
        "should respond with the first three available ports (32773, 32774, 32775)": function (err, ports) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.deepEqual(ports, [32773, 32774, 32775]);
        }
      }
    }
  }
})
.export(module);
