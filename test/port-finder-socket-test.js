/*
 * portfinder-test.js: Tests for the `portfinder` module.
 *
 * (C) 2011, Charlie Robbins
 *
 */

"use strict";

var assert = require('assert'),
    exec = require('child_process').exec,
    net = require('net'),
    path = require('path'),
    async = require('async'),
    vows = require('vows'),
    portfinder = require('../lib/portfinder'),
    fs = require('fs'),
    glob = require('glob');

var servers = [],
    socketDir = path.join(__dirname, 'fixtures'),
    badDir = path.join(__dirname, 'bad-dir');

function createServers (callback) {
  var base = 0;

  async.whilst(
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

function cleanup(callback) {
  fs.rmdirSync(badDir);
  glob(path.resolve(socketDir, '*'), function (err, files) {
    if (err) { callback(err); }
    for (var i = 0; i < files.length; i++) { fs.unlinkSync(files[i]); }
    callback(null, true);
  });
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
      "the getPort() method": {
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
        "with a directory that doesnt exist": {
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
