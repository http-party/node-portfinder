/*
 * portfinder.js: A simple tool to find an open port on the current machine.
 *
 * (C) 2011, Charlie Robbins
 *
 */
import * as fs from "fs";
import * as os from "os";
import * as net from "net";
import * as path from "path";
import _async from "async";
import debug from "debug";
import mkdirp from "mkdirp";
const debugTestPort = debug("portfinder:testPort");
const debugGetPort = debug("portfinder:getPort");
const debugDefaultHosts = debug("portfinder:defaultHosts");
const internals = {
    testPort: (_options, callback) => {
        let options = {};
        if (!callback || typeof _options === "function") {
            callback = _options;
        }
        else {
            options = _options;
        }
        //
        // Create an empty listener for the port testing server.
        //
        options.server ?? (options.server = net.createServer(() => { }));
        debugTestPort("entered testPort(): trying", options.host, "port", options.port);
        function onListen() {
            debugTestPort("done w/ testPort(): OK", options.host, "port", options.port);
            options.server.removeListener("error", onError);
            options.server.close();
            callback(null, options.port);
        }
        function onError(err) {
            debugTestPort("done w/ testPort(): failed", options.host, "w/ port", options.port, "with error", err.code);
            options.server.removeListener("listening", onListen);
            if (!(err.code == "EADDRINUSE" || err.code == "EACCES")) {
                return callback(err);
            }
            const nextPort = exports.nextPort(options.port);
            if (nextPort > exports.highestPort) {
                return callback(new Error("No open ports available"));
            }
            internals.testPort({
                port: nextPort,
                host: options.host,
                server: options.server,
            }, callback);
        }
        options.server.once("error", onError);
        options.server.once("listening", onListen);
        if (options.host) {
            options.server.listen(options.port, options.host);
        }
        else {
            /*
            Judgement of service without host
            example:
              express().listen(options.port)
          */
            options.server.listen(options.port);
        }
    },
};
/**
 * The lowest port to begin any port search from.
 */
export let basePort = 8000;
/**
 * Set the lowest port to begin any port search from.
 */
export function setBasePort(port) {
    basePort = port;
}
/**
 * The highest port to end any port search from.
 */
export let highestPort = 65535;
/**
 * Set the higheset port to end any port search from.
 */
export function setHighestPort(port) {
    highestPort = port;
}
//
// ### @basePath {string}
// Default path to begin any socket search from
//
export const basePath = "/tmp/portfinder";
export function getPort(_options, callback) {
    let options = {};
    if (!callback || typeof _options === "function") {
        callback = _options;
    }
    else {
        options = _options;
    }
    options.port = Number(options.port) || Number(basePort);
    options.host = options.host || null;
    options.stopPort = Number(options.stopPort) || Number(highestPort);
    if (!options.startPort) {
        options.startPort = Number(options.port);
        if (options.startPort < 0) {
            throw Error(`Provided options.startPort(${options.startPort}) is less than 0, which are cannot be bound.`);
        }
        if (options.stopPort < options.startPort) {
            throw Error(`Provided options.stopPort(${options.stopPort}is less than options.startPort (${options.startPort})`);
        }
    }
    if (options.host) {
        if (_defaultHosts.indexOf(options.host) !== -1) {
            _defaultHosts.push(options.host);
        }
    }
    const openPorts = [];
    let currentHost;
    return _async.eachSeries(_defaultHosts, (host, next) => {
        debugGetPort("in eachSeries() iteration callback: host is", host);
        return internals.testPort({ host, port: options.port }, (err, port) => {
            if (err) {
                debugGetPort("in eachSeries() iteration callback testPort() callback", "with an err:", err.code);
                currentHost = host;
                return next(err);
            }
            else {
                debugGetPort("in eachSeries() iteration callback testPort() callback", "with a success for port", port);
                openPorts.push(port);
                return next();
            }
        });
    }, (err) => {
        if (err) {
            debugGetPort("in eachSeries() result callback: err is", err);
            // If we get EADDRNOTAVAIL it means the host is not bindable, so remove it
            // from _defaultHosts and start over. For ubuntu, we use EINVAL for the same
            if (err.code === "EADDRNOTAVAIL" || err.code === "EINVAL") {
                if (options.host === currentHost) {
                    // if bad address matches host given by user, tell them
                    //
                    // NOTE: We may need to one day handle `my-non-existent-host.local` if users
                    // report frustration with passing in hostnames that DONT map to bindable
                    // hosts, without showing them a good error.
                    var msg = `Provided host ${options.host} could NOT be bound. Please provide a different host address or hostname`;
                    return callback(Error(msg));
                }
                else {
                    const idx = _defaultHosts.indexOf(currentHost);
                    _defaultHosts.splice(idx, 1);
                    return getPort(options, callback);
                }
            }
            else {
                // error is not accounted for, file ticket, handle special case
                return callback(err);
            }
        }
        // sort so we can compare first host to last host
        openPorts.sort((a, b) => a - b);
        debugGetPort("in eachSeries() result callback: openPorts is", openPorts);
        if (openPorts[0] === openPorts[openPorts.length - 1]) {
            // if first === last, we found an open port
            if (openPorts[0] <= options.stopPort) {
                return callback(null, openPorts[0]);
            }
            else {
                const msg = `No open ports found in between ${options.startPort} and ${options.stopPort}`;
                return callback(Error(msg));
            }
        }
        else {
            // otherwise, try again, using sorted port, aka, highest open for >= 1 host
            return getPort({
                port: openPorts.pop(),
                host: options.host,
                startPort: options.startPort,
                stopPort: options.stopPort,
            }, callback);
        }
    });
}
//
// ### function getPortPromise (options)
// #### @options {Object} Settings to use when finding the necessary port
// Responds a promise to an unbound port on the current machine.
//
export function getPortPromise(options) {
    if (typeof Promise !== "function") {
        throw Error("Native promise support is not available in this version of node." +
            "Please install a polyfill and assign Promise to global.Promise before calling this method");
    }
    options ?? (options = {});
    return new Promise((resolve, reject) => {
        const callback = (err, port) => {
            if (err) {
                return reject(err);
            }
            resolve(port);
        };
        getPort(options, callback);
    });
}
//
// ### function getPorts (count, options, callback)
// #### @count {Number} The number of ports to find
// #### @options {Object} Settings to use when finding the necessary port
// #### @callback {function} Continuation to respond to when complete.
// Responds with an array of unbound ports on the current machine.
//
export function getPorts(count, _options, callback) {
    let options = {};
    if (!callback || typeof _options === "function") {
        callback = _options;
    }
    else {
        options = _options;
    }
    let lastPort = null;
    _async.timesSeries(count, (index, asyncCallback) => {
        if (lastPort) {
            options.port = nextPort(lastPort);
        }
        getPort(options, (err, port) => {
            if (err || port === undefined) {
                asyncCallback(err);
            }
            else {
                lastPort = port;
                asyncCallback(null, port);
            }
        });
    }, callback);
}
//
// ### function getSocket (options, callback)
// #### @options {Object} Settings to use when finding the necessary port
// #### @callback {function} Continuation to respond to when complete.
// Responds with a unbound socket using the specified directory and base
// name on the current machine.
//
export function getSocket(_options, callback) {
    let options = {};
    if (!callback || typeof _options === "function") {
        callback = _options;
    }
    else {
        options = _options;
    }
    options.mod ?? (options.mod = parseInt("755", 8));
    options.path ?? (options.path = `${basePath}.sock`);
    //
    // Tests the specified socket
    //
    function testSocket() {
        fs.stat(options.path, (err) => {
            //
            // If file we're checking doesn't exist (thus, stating it emits ENOENT),
            // we should be OK with listening on this socket.
            //
            if (err) {
                if (err.code == "ENOENT") {
                    callback(null, options.path);
                }
                else {
                    callback(err);
                }
            }
            else {
                //
                // This file exists, so it isn't possible to listen on it. Lets try
                // next socket.
                //
                options.path = nextSocket(options.path);
                getSocket(options, callback);
            }
        });
    }
    //
    // Create the target `dir` then test connection
    // against the socket.
    //
    function createAndTestSocket(dir) {
        mkdirp(dir, options.mod, (err) => {
            if (err) {
                return callback(err);
            }
            options.exists = true;
            testSocket();
        });
    }
    //
    // Check if the parent directory of the target
    // socket path exists. If it does, test connection
    // against the socket. Otherwise, create the directory
    // then test connection.
    //
    function checkAndTestSocket() {
        const dir = path.dirname(options.path);
        fs.stat(dir, (err, stats) => {
            if (err || !stats.isDirectory()) {
                return createAndTestSocket(dir);
            }
            options.exists = true;
            testSocket();
        });
    }
    //
    // If it has been explicitly stated that the
    // target `options.path` already exists, then
    // simply test the socket.
    //
    return options.exists ? testSocket() : checkAndTestSocket();
}
//
// ### function nextPort (port)
// #### @port {Number} Port to increment from.
// Gets the next port in sequence from the
// specified `port`.
//
export function nextPort(port) {
    return port + 1;
}
//
// ### function nextSocket (socketPath)
// #### @socketPath {string} Path to increment from
// Gets the next socket path in sequence from the
// specified `socketPath`.
//
export function nextSocket(socketPath) {
    const dir = path.dirname(socketPath);
    const name = path.basename(socketPath, ".sock");
    const match = name.match(/^([a-zA-z]+)(\d*)$/i);
    let index = parseInt(match[2]);
    const base = match[1];
    if (isNaN(index)) {
        index = 0;
    }
    index += 1;
    return path.join(dir, `${base + index}.sock`);
}
/**
 * @desc List of internal hostnames provided by your machine. A user
 *       provided hostname may also be provided when calling portfinder.getPort,
 *       which would then be added to the default hosts we lookup and return here.
 *
 * @return {array}
 *
 * Long Form Explantion:
 *
 *    - Input: (os.networkInterfaces() w/ MacOS 10.11.5+ and running a VM)
 *
 *        { lo0:
 *         [ { address: '::1',
 *             netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
 *             family: 'IPv6',
 *             mac: '00:00:00:00:00:00',
 *             scopeid: 0,
 *             internal: true },
 *           { address: '127.0.0.1',
 *             netmask: '255.0.0.0',
 *             family: 'IPv4',
 *             mac: '00:00:00:00:00:00',
 *             internal: true },
 *           { address: 'fe80::1',
 *             netmask: 'ffff:ffff:ffff:ffff::',
 *             family: 'IPv6',
 *             mac: '00:00:00:00:00:00',
 *             scopeid: 1,
 *             internal: true } ],
 *        en0:
 *         [ { address: 'fe80::a299:9bff:fe17:766d',
 *             netmask: 'ffff:ffff:ffff:ffff::',
 *             family: 'IPv6',
 *             mac: 'a0:99:9b:17:76:6d',
 *             scopeid: 4,
 *             internal: false },
 *           { address: '10.0.1.22',
 *             netmask: '255.255.255.0',
 *             family: 'IPv4',
 *             mac: 'a0:99:9b:17:76:6d',
 *             internal: false } ],
 *        awdl0:
 *         [ { address: 'fe80::48a8:37ff:fe34:aaef',
 *             netmask: 'ffff:ffff:ffff:ffff::',
 *             family: 'IPv6',
 *             mac: '4a:a8:37:34:aa:ef',
 *             scopeid: 8,
 *             internal: false } ],
 *        vnic0:
 *         [ { address: '10.211.55.2',
 *             netmask: '255.255.255.0',
 *             family: 'IPv4',
 *             mac: '00:1c:42:00:00:08',
 *             internal: false } ],
 *        vnic1:
 *         [ { address: '10.37.129.2',
 *             netmask: '255.255.255.0',
 *             family: 'IPv4',
 *             mac: '00:1c:42:00:00:09',
 *             internal: false } ] }
 *
 *    - Output:
 *
 *         [
 *          '0.0.0.0',
 *          '::1',
 *          '127.0.0.1',
 *          'fe80::1',
 *          '10.0.1.22',
 *          'fe80::48a8:37ff:fe34:aaef',
 *          '10.211.55.2',
 *          '10.37.129.2'
 *         ]
 *
 *     Note we export this so we can use it in our tests, otherwise this API is private
 */
export const _defaultHosts = (() => {
    let interfaces = {};
    try {
        interfaces = os.networkInterfaces();
    }
    catch (e) {
        // As of October 2016, Windows Subsystem for Linux (WSL) does not support
        // the os.networkInterfaces() call and throws instead. For this platform,
        // assume 0.0.0.0 as the only address
        //
        // - https://github.com/Microsoft/BashOnWindows/issues/468
        //
        // - Workaround is a mix of good work from the community:
        //   - https://github.com/http-party/node-portfinder/commit/8d7e30a648ff5034186551fa8a6652669dec2f2f
        //   - https://github.com/yarnpkg/yarn/pull/772/files
        if (e.syscall === "uv_interface_addresses") {
            // swallow error because we're just going to use defaults
            // documented @ https://github.com/nodejs/node/blob/4b65a65e75f48ff447cabd5500ce115fb5ad4c57/doc/api/net.md#L231
        }
        else {
            throw e;
        }
    }
    const interfaceNames = Object.keys(interfaces);
    const // !important - dont remove, hence the naming :)
    hiddenButImportantHost = "0.0.0.0";
    const results = [hiddenButImportantHost];
    for (let i = 0; i < interfaceNames.length; i++) {
        const _interface = interfaces[interfaceNames[i]];
        for (let j = 0; j < _interface.length; j++) {
            const curr = _interface[j];
            results.push(curr.address);
        }
    }
    // add null value, For createServer function, do not use host.
    results.push(null);
    debugDefaultHosts("_defaultHosts is: %o", results);
    return results;
})();
