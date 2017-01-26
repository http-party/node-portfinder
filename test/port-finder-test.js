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
      "the getPortPromise() method": {
        topic: function () {
          var vow = this;

          if (typeof Promise === 'function') {
            setTimeout(function() {
              portfinder.getPortPromise()
                .then(function (port) {
                  vow.callback(null, port);
                })
                .catch(function (err) {
                  vow.callback(err, null);
                });
            }.bind(this), 3000); // wait for cleanup of bound hosts
          } else {
            this.callback(null, 'not applicable')
          }
        },
        "should respond with a promise of first free port (32773) if Promise are available": function (err, port) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          if (port !== 'not applicable') {
            assert.equal(port, 32773);
          }
        }
      },
      "the getPort() method with user passed duplicate host": {
        topic: function () {
          setTimeout(function() {
            portfinder.getPort({ host: 'localhost' }, this.callback);
          }.bind(this), 3000); // wait for cleanup of bound hosts
        },
        "should respond with the first free port (32773)": function (err, port) {
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.equal(port, 32773);
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
          if (err) { debugVows(err); }
          assert.isTrue(!err);
          assert.equal(port, 32768);
        }
      }
    }
  }
}).export(module);
