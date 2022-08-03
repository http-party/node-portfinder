/*
 * portfinder-test.js: Tests for the `portfinder` module.
 *
 * (C) 2011, Charlie Robbins
 *
 */

"use strict";

var assert = require('assert'),
    net = require('net'),
    path = require('path'),
    _async = require('async'),
    vows = require('vows'),
    portfinder = require('../lib/portfinder'),
    fs = require('fs');

var servers = [],
    socketDir = path.join(__dirname, 'fixtures'),
    badDir = path.join(__dirname, 'bad-dir');

function createServers (callback) {
  var base = 0;

  _async.whilst(
    function () { return base < 5 },
    function (next) {
      var server = net.createServer(function () { }),
          name = base === 0 ? 'test.sock' : 'test' + base + '.sock',
          sock = path.join(socketDir, name);

      // shamelessly stolen from foreverjs,
      // https://github.com/foreverjs/forever/blob/6d143609dd3712a1cf1bc515d24ac6b9d32b2588/lib/forever/worker.js#L141-L154
      if (process.platform === 'win32') {
        //
        // Create 'symbolic' file on the system, so it can be later
        // found via "forever list" since the `\\.pipe\\*` "files" can't
        // be enumerated because ... Windows.
        //
        fs.openSync(sock, 'w');

        //
        // It needs the prefix, otherwise EACCESS error happens on Windows
        // (no .sock extension, only named pipes with .pipe prefixes)
        //
        sock = '\\\\.\\pipe\\' + sock;
      }

      server.listen(sock, next);
      base++;
      servers.push(server);
    }, callback);
}

function stopServers(callback, index) {
  if (index < servers.length) {
    servers[index].close(function (err) {
      if (err) {
        callback(err, false);
      } else {
        stopServers(callback, index + 1);
      }
    });
  } else {
    callback(null, true);
  }
}

function cleanup(callback) {
  if (fs.existsSync(path.join(badDir, 'deeply', 'nested'))) {
    fs.rmdirSync(path.join(badDir, 'deeply', 'nested'));
  }
  if (fs.existsSync(path.join(badDir, 'deeply'))) {
    fs.rmdirSync(path.join(badDir, 'deeply'));
  }
  if (fs.existsSync(badDir)) {
    fs.rmdirSync(badDir);
  }
  stopServers(callback, 0);
}

vows.describe('portfinder').addBatch({
  "When using portfinder module": {
    "with 5 existing servers": {
      topic: function () {
        createServers(function() {
          portfinder.getSocket({
            path: path.join(badDir, 'test.sock')
          }, this.callback);
        }.bind(this));
      },
      "the getSocket() method": {
        topic: function () {
          portfinder.getSocket({
            path: path.join(socketDir, 'test.sock')
          }, this.callback);
        },
        "should respond with the first free socket (test5.sock)": function (err, socket) {
          assert.isTrue(!err);
          assert.equal(socket, path.join(socketDir, 'test5.sock'));
        }
      }
    }
  }
}).addBatch({
  "When using portfinder module": {
    "with no existing servers": {
      "the getSocket() method": {
        "with a directory that doesn't exist": {
          topic: function () {
            fs.rmdir(badDir, function () {
              portfinder.getSocket({
                path: path.join(badDir, 'test.sock')
              }, this.callback);
            }.bind(this));
          },
          "should respond with the first free socket (test.sock)": function (err, socket) {
            assert.isTrue(!err);
            assert.equal(socket, path.join(badDir, 'test.sock'));
          }
        },
        "with a nested directory that doesn't exist": {
          topic: function () {
            var that = this;
            fs.rmdir(path.join(badDir, 'deeply', 'nested'), function () {
              fs.rmdir(path.join(badDir, 'deeply'), function () {
                fs.rmdir(badDir, function () {
                  portfinder.getSocket({
                    path: path.join(badDir, 'deeply', 'nested', 'test.sock')
                  }, that.callback);
                });
              });
            });
          },
          "should respond with the first free socket (test.sock)": function (err, socket) {
            assert.isTrue(!err);
            assert.equal(socket, path.join(badDir, 'deeply', 'nested', 'test.sock'));
          }
        },
        "with a directory that exists": {
          topic: function () {
            portfinder.getSocket({
              path: path.join(socketDir, 'exists.sock')
            }, this.callback);
          },
          "should respond with the first free socket (exists.sock)": function (err, socket) {
            assert.isTrue(!err);
            assert.equal(socket, path.join(socketDir, 'exists.sock'));
          }
        }
      }
    }
  }
}).addBatch({
  "When the tests are over": {
    topic: function() {
      cleanup(this.callback);
    },
    "necessary cleanup should have taken place": function (err, wasRun) {
      assert.isTrue(!err);
      assert.isTrue(wasRun);
    }
  }
}).export(module);
