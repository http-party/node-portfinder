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

  describe.each([
    ['getPorts()', false, portfinder.getPorts],
    ['getPorts()', true, portfinder.getPorts],
    ['getPortsPromise()', true, portfinder.getPortsPromise],
  ])(`the %s method (promise: %p)`, function (name, isPromise, method) {
    test('with an argument of 3 should respond with the first three available ports (32773, 32774, 32775)', function (done) {
      if (isPromise) {
        method(3)
          .then(function (ports) {
            expect(ports).toEqual([32773, 32774, 32775]);
            done();
          })
          .catch(function (err) {
            done(err);
          });
      } else {
        method(3, function (err, ports) {
          if (err) {
            done(err);
            return;
          }
          expect(err).toBeNull();
          expect(ports).toEqual([32773, 32774, 32775]);
          done();
        });
      }
    });

    test('with stopPort smaller than 3 available ports', function (done) {
      if (isPromise) {
        method(3, { stopPort: 32774 })
          .then(function () {
            done('Expected error to be thrown');
          })
          .catch(function (err) {
            expect(err).not.toBeNull();
            expect(err.message).toEqual('Searching for an open port failed at port 32775.');
            done();
          });
      } else {
        method(3, { stopPort: 32774 }, function (err, ports) {
          expect(err).not.toBeNull();
          expect(err.message).toEqual('Searching for an open port failed at port 32775.');
          expect(ports).toEqual([32773, 32774, undefined]); // Failed at port 32775
          done();
        });
      }
    });
  });
});

describe('with no existing servers', function () {
  describe.each([
    ['getPorts()', false, portfinder.getPorts],
    ['getPorts()', true, portfinder.getPorts],
    ['getPortsPromise()', true, portfinder.getPortsPromise],
  ])(`the %s method (promise: %p)`, function (name, isPromise, method) {
    test('with an argument of 3 should respond with the first three available ports (32768, 32769, 32770)', function (done) {
      if (isPromise) {
        method(3)
          .then(function (ports) {
            expect(ports).toEqual([32768, 32769, 32770]);
            done();
          })
          .catch(function (err) {
            done(err);
          });
      } else {
        method(3, function (err, ports) {
          if (err) {
            done(err);
            return;
          }
          expect(err).toBeNull();
          expect(ports).toEqual([32768, 32769, 32770]);
          done();
        });
      }
    });
  });
});
