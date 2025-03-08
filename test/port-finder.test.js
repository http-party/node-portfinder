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

  test('should respond with the first free port (32773)', function (done) {
    // closeServers(); // close all the servers first!
    portfinder.getPort(function (err, port) {
      expect(err).toBeNull();
      expect(port).toEqual(32773);
      done();
    });
  });

  test('the getPort() method with user passed duplicate host', function (done) {
    portfinder.getPort({ host: 'localhost' }, function (err, port) {
      expect(err).toBeNull();
      expect(port).toEqual(32773);
      done();
    });
  });

  test('the getPort() method with stopPort smaller than available port', function (done) {
    // stopPort: 32722 is smaller than available port 32773 (32768 + 5)
    portfinder.getPort({ stopPort: 32772 }, function (err, port) {
      expect(err).not.toBeNull();
      expect(err.message).toEqual('No open ports found in between 32768 and 32772');
      expect(port).toBeUndefined();
      done();
    });
  });

  test('should respond with the first free port (32773) less than provided stopPort', function (done) {
    // stopPort: 32774 is greater than available port 32773 (32768 + 5)
    portfinder.getPort({ stopPort: 32774 }, function (err, port) {
      if (err) {
        done(err);
        return;
      }
      expect(err).toBeNull();
      expect(port).toEqual(32773);
      done();
    });
  });
});

describe('with no existing servers', function () {
  test('should respond with the first free port (32768)', function (done) {
    portfinder.getPort(function (err, port) {
      if (err) {
        done(err);
        return;
      }
      expect(err).toBeNull();
      expect(port).toEqual(32768);
      done();
    });
  });

  test('the getPortPromise() method should respond with a promise of first free port (32768)', function (done) {
    portfinder.getPortPromise()
      .then(function (port) {
        expect(port).toEqual(32768);
        done();
      })
      .catch(function (err) {
        done(err);
      });
  });
});

test('the getPort() method with startPort less than or equal to 80', function (done) {
  portfinder.getPort({ startPort: 80 }, function (err, port) {
    expect(err).toBeNull();
    expect(port).toBeGreaterThanOrEqual(80);
    done();
  });
});

describe('with no available ports above the start port', function () {
  const servers = [];
  beforeEach(function (done) {
    helper.startServers(servers, 65530, 65536, done);
  });
  afterEach(function (done) {
    helper.stopServers(servers, done);
  });

  test('the getPort() method requesting an unavailable port', function (done) {
    portfinder.getPort({ port: 65530 }, function (err, port) {
      expect(err).not.toBeNull();
      expect(err.message).toEqual('No open ports available');
      expect(port).toBeUndefined();
      done();
    });
  });
});
