/*
 * portfinder-test.js: Tests for the `portfinder` module.
 *
 * (C) 2011, Charlie Robbins
 *
 */

"use strict";

const portfinder = require('../lib/portfinder'),
      helper = require('./helper');

const basePort = 32768;
portfinder.basePort = basePort;

describe('with 5 existing servers', function () {
  const servers = [];
  beforeAll(function (done) {
    helper.startServers(servers, done);
  });

  afterAll(function (done) {
    helper.stopServers(servers, done);
  });

  describe.each([
    ['getPort()', false, portfinder.getPort],
    ['getPort()', true, portfinder.getPort],
    ['getPortPromise()', true, portfinder.getPortPromise],
  ])(`the %s method (promise: %p)`, function (name, isPromise, method) {
    test('should respond with the first free port (32773)', function (done) {
      if (isPromise) {
        method()
          .then(function (port) {
            expect(port).toEqual(32773);
            done();
          })
          .catch(function (err) {
            done(err);
          });
      } else {
        method(function (err, port) {
          if (err) {
            done(err);
            return;
          }
          expect(err).toBeNull();
          expect(port).toEqual(32773);
          done();
        });
      }
    });

    test('with user passed duplicate host', function (done) {
      if (isPromise) {
        method({ host: 'localhost' })
          .then(function (port) {
            expect(port).toEqual(32773);
            done();
          })
          .catch(function (err) {
            done(err);
          });
      } else {
        method({ host: 'localhost' }, function (err, port) {
          if (err) {
            done(err);
            return;
          }
          expect(err).toBeNull();
          expect(port).toEqual(32773);
          done();
        });
      }
    });

    test('with stopPort smaller than available port', function (done) {
      // stopPort: 32772 is smaller than available port 32773 (32768 + 5)
      if (isPromise) {
        method({ stopPort: 32772 })
          .then(function () {
            done('Expected error to be thrown');
          })
          .catch(function (err) {
            expect(err).not.toBeNull();
            expect(err.message).toEqual('No open ports found in between 32768 and 32772');
            done();
          });
      } else {
        method({ stopPort: 32772 }, function (err, port) {
          expect(err).not.toBeNull();
          expect(err.message).toEqual('No open ports found in between 32768 and 32772');
          expect(port).toBeUndefined();
          done();
        });
      }
    });

    test('should respond with the first free port (32773) less than provided stopPort', function (done) {
      // stopPort: 32774 is greater than available port 32773 (32768 + 5)
      if (isPromise) {
        method({ stopPort: 32774 })
          .then(function (port) {
            expect(port).toEqual(32773);
            done();
          })
          .catch(function (err) {
            done(err);
          });
      } else {
        method({ stopPort: 32774 }, function (err, port) {
          if (err) {
            done(err);
            return;
          }
          expect(err).toBeNull();
          expect(port).toEqual(32773);
          done();
        });
      }
    });
  });
});

describe('with no existing servers', function () {
  describe.each([
    ['getPort()', false, portfinder.getPort],
    ['getPort()', true, portfinder.getPort],
    ['getPortPromise()', true, portfinder.getPortPromise],
  ])(`the %s method (promise: %p)`, function (name, isPromise, method) {
    test('should respond with the first free port (32768)', function (done) {
      if (isPromise) {
        method()
          .then(function (port) {
            expect(port).toEqual(32768);
            done();
          })
          .catch(function (err) {
            done(err);
          });
      } else {
        method(function (err, port) {
          if (err) {
            done(err);
            return;
          }
          expect(err).toBeNull();
          expect(port).toEqual(32768);
          done();
        });
      }
    });
  });
});


describe('with startPort provided', function () {
  beforeAll(function () {
    portfinder.basePort = 8000;
  });
  afterAll(function () {
    portfinder.basePort = basePort;
  });
  describe.each([
    ['getPort()', false, portfinder.getPort],
    ['getPort()', true, portfinder.getPort],
    ['getPortPromise()', true, portfinder.getPortPromise],
  ])(`the %s method (promise: %p)`, function (name, isPromise, method) {
    test('with startPort less than or equal to 9050', function (done) {
      if (isPromise) {
        method({ startPort: 9050 })
          .then(function (port) {
            expect(port).toBeGreaterThanOrEqual(9050);
            done();
          })
          .catch(function (err) {
            done(err);
          });
      } else {
        method({ startPort: 9050 }, function (err, port) {
          if (err) {
            done(err);
            return;
          }
          expect(err).toBeNull();
          expect(port).toBeGreaterThanOrEqual(9050);
          done();
        });
      }
    });
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

  describe.each([
    ['getPort()', false, portfinder.getPort],
    ['getPort()', true, portfinder.getPort],
    ['getPortPromise()', true, portfinder.getPortPromise],
  ])(`the %s method (promise: %p)`, function (name, isPromise, method) {
    test('the getPort() method requesting an unavailable port', function (done) {
      if (isPromise) {
        method({ port: 65530 })
          .then(function () {
            done('Expected error to be thrown');
          })
          .catch(function (err) {
            expect(err).not.toBeNull();
            expect(err.message).toEqual('No open ports available');
            done();
          });
      } else {
        method({ port: 65530 }, function (err, port) {
          expect(err).not.toBeNull();
          expect(err.message).toEqual('No open ports available');
          expect(port).toBeUndefined();
          done();
        });
      }
    });
  });
});

test('should return error if port is negative', function (done) {
  portfinder.getPort({ port: -1 }, function (err, port) {
    expect(err).not.toBeNull();
    expect(err.message).toEqual('Provided options.port(-1) is less than 0, which are cannot be bound.');
    expect(port).toBeUndefined();
    done();
  });
});

test('should return error if port is less than stopPort', function (done) {
  portfinder.getPort({ port: 32768, stopPort: 32767 }, function (err, port) {
    expect(err).not.toBeNull();
    expect(err.message).toEqual('Provided options.stopPort(32767) is less than options.port(32768)');
    expect(port).toBeUndefined();
    done();
  });
});
