/*
 * portfinder-test.js: Tests for the `portfinder` module.
 *
 * (C) 2011, Charlie Robbins
 *
 */

"use strict";

const portfinder = require('../lib/portfinder'),
      helper = require('./helper');

portfinder.basePort = 32768;

describe('with 5 existing servers', function () {
  const servers = [];
  beforeAll(function (done) {
    helper.startServers(servers, done);
  });

  afterAll(function (done) {
    helper.stopServers(servers, done);
  });

  test('the getPorts() method with an argument of 3 should respond with the first three available ports (32773, 32774, 32775)', function (done) {
    portfinder.getPorts(3, function (err, ports) {
      expect(err).toBeNull();
      expect(ports).toEqual([32773, 32774, 32775]);
      done();
    });
  });
});

describe('with no existing servers', function () {
  test('the getPorts() method with an argument of 3 should respond with the first three available ports (32768, 32769, 32770)', function (done) {
    portfinder.getPorts(3, function (err, ports) {
      expect(err).toBeNull();
      expect(ports).toEqual([32768, 32769, 32770]);
      done();
    });
  });

  test('the getPortPromises() method with an argument of 3 should respond with the first three available ports (32768, 32769, 32770)', function (done) {
    portfinder.getPortsPromise(3)
      .then(function (ports) {
        expect(ports).toEqual([32768, 32769, 32770]);
        done();
      })
      .catch(function (err) {
        done(err);
      });
  });
});
