"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports._defaultHosts = exports.nextSocket = exports.nextPort = exports.getSocket = exports.getPorts = exports.getPortPromise = exports.getPort = exports.basePath = exports.setHighestPort = exports.highestPort = exports.setBasePort = exports.basePort = void 0;
/*
 * portfinder.js: A simple tool to find an open port on the current machine.
 *
 * (C) 2011, Charlie Robbins
 *
 */
var fs = __importStar(require("fs"));
var os = __importStar(require("os"));
var net = __importStar(require("net"));
var path = __importStar(require("path"));
var async_1 = __importDefault(require("async"));
var debug_1 = __importDefault(require("debug"));
var mkdirp_1 = __importDefault(require("mkdirp"));
var debugTestPort = (0, debug_1["default"])("portfinder:testPort");
var debugGetPort = (0, debug_1["default"])("portfinder:getPort");
var debugDefaultHosts = (0, debug_1["default"])("portfinder:defaultHosts");
var internals = {
    testPort: function (_options, callback) {
        var _a;
        var options = {};
        if (!callback || typeof _options === "function") {
            callback = _options;
        }
        else {
            options = _options;
        }
        //
        // Create an empty listener for the port testing server.
        //
        (_a = options.server) !== null && _a !== void 0 ? _a : (options.server = net.createServer(function () { }));
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
            var nextPort = exports.nextPort(options.port);
            if (nextPort > exports.highestPort) {
                return callback(new Error("No open ports available"));
            }
            internals.testPort({
                port: nextPort,
                host: options.host,
                server: options.server
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
    }
};
/**
 * The lowest port to begin any port search from.
 */
exports.basePort = 8000;
/**
 * Set the lowest port to begin any port search from.
 */
function setBasePort(port) {
    exports.basePort = port;
}
exports.setBasePort = setBasePort;
/**
 * The highest port to end any port search from.
 */
exports.highestPort = 65535;
/**
 * Set the higheset port to end any port search from.
 */
function setHighestPort(port) {
    exports.highestPort = port;
}
exports.setHighestPort = setHighestPort;
//
// ### @basePath {string}
// Default path to begin any socket search from
//
exports.basePath = "/tmp/portfinder";
function getPort(_options, callback) {
    var options = {};
    if (!callback || typeof _options === "function") {
        callback = _options;
    }
    else {
        options = _options;
    }
    options.port = Number(options.port) || Number(exports.basePort);
    options.host = options.host || null;
    options.stopPort = Number(options.stopPort) || Number(exports.highestPort);
    if (!options.startPort) {
        options.startPort = Number(options.port);
        if (options.startPort < 0) {
            throw Error("Provided options.startPort(".concat(options.startPort, ") is less than 0, which are cannot be bound."));
        }
        if (options.stopPort < options.startPort) {
            throw Error("Provided options.stopPort(".concat(options.stopPort, "is less than options.startPort (").concat(options.startPort, ")"));
        }
    }
    if (options.host) {
        if (exports._defaultHosts.indexOf(options.host) !== -1) {
            exports._defaultHosts.push(options.host);
        }
    }
    var openPorts = [];
    var currentHost;
    return async_1["default"].eachSeries(exports._defaultHosts, function (host, next) {
        debugGetPort("in eachSeries() iteration callback: host is", host);
        return internals.testPort({ host: host, port: options.port }, function (err, port) {
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
    }, function (err) {
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
                    var msg = "Provided host ".concat(options.host, " could NOT be bound. Please provide a different host address or hostname");
                    return callback(Error(msg));
                }
                else {
                    var idx = exports._defaultHosts.indexOf(currentHost);
                    exports._defaultHosts.splice(idx, 1);
                    return getPort(options, callback);
                }
            }
            else {
                // error is not accounted for, file ticket, handle special case
                return callback(err);
            }
        }
        // sort so we can compare first host to last host
        openPorts.sort(function (a, b) { return a - b; });
        debugGetPort("in eachSeries() result callback: openPorts is", openPorts);
        if (openPorts[0] === openPorts[openPorts.length - 1]) {
            // if first === last, we found an open port
            if (openPorts[0] <= options.stopPort) {
                return callback(null, openPorts[0]);
            }
            else {
                var msg_1 = "No open ports found in between ".concat(options.startPort, " and ").concat(options.stopPort);
                return callback(Error(msg_1));
            }
        }
        else {
            // otherwise, try again, using sorted port, aka, highest open for >= 1 host
            return getPort({
                port: openPorts.pop(),
                host: options.host,
                startPort: options.startPort,
                stopPort: options.stopPort
            }, callback);
        }
    });
}
exports.getPort = getPort;
//
// ### function getPortPromise (options)
// #### @options {Object} Settings to use when finding the necessary port
// Responds a promise to an unbound port on the current machine.
//
function getPortPromise(options) {
    if (typeof Promise !== "function") {
        throw Error("Native promise support is not available in this version of node." +
            "Please install a polyfill and assign Promise to global.Promise before calling this method");
    }
    options !== null && options !== void 0 ? options : (options = {});
    return new Promise(function (resolve, reject) {
        var callback = function (err, port) {
            if (err) {
                return reject(err);
            }
            resolve(port);
        };
        getPort(options, callback);
    });
}
exports.getPortPromise = getPortPromise;
//
// ### function getPorts (count, options, callback)
// #### @count {Number} The number of ports to find
// #### @options {Object} Settings to use when finding the necessary port
// #### @callback {function} Continuation to respond to when complete.
// Responds with an array of unbound ports on the current machine.
//
function getPorts(count, _options, callback) {
    var options = {};
    if (!callback || typeof _options === "function") {
        callback = _options;
    }
    else {
        options = _options;
    }
    var lastPort = null;
    async_1["default"].timesSeries(count, function (index, asyncCallback) {
        if (lastPort) {
            options.port = nextPort(lastPort);
        }
        getPort(options, function (err, port) {
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
exports.getPorts = getPorts;
//
// ### function getSocket (options, callback)
// #### @options {Object} Settings to use when finding the necessary port
// #### @callback {function} Continuation to respond to when complete.
// Responds with a unbound socket using the specified directory and base
// name on the current machine.
//
function getSocket(_options, callback) {
    var _a, _b;
    var options = {};
    if (!callback || typeof _options === "function") {
        callback = _options;
    }
    else {
        options = _options;
    }
    (_a = options.mod) !== null && _a !== void 0 ? _a : (options.mod = parseInt("755", 8));
    (_b = options.path) !== null && _b !== void 0 ? _b : (options.path = "".concat(exports.basePath, ".sock"));
    //
    // Tests the specified socket
    //
    function testSocket() {
        fs.stat(options.path, function (err) {
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
        (0, mkdirp_1["default"])(dir, options.mod, function (err) {
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
        var dir = path.dirname(options.path);
        fs.stat(dir, function (err, stats) {
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
exports.getSocket = getSocket;
//
// ### function nextPort (port)
// #### @port {Number} Port to increment from.
// Gets the next port in sequence from the
// specified `port`.
//
function nextPort(port) {
    return port + 1;
}
exports.nextPort = nextPort;
//
// ### function nextSocket (socketPath)
// #### @socketPath {string} Path to increment from
// Gets the next socket path in sequence from the
// specified `socketPath`.
//
function nextSocket(socketPath) {
    var dir = path.dirname(socketPath);
    var name = path.basename(socketPath, ".sock");
    var match = name.match(/^([a-zA-z]+)(\d*)$/i);
    var index = parseInt(match[2]);
    var base = match[1];
    if (isNaN(index)) {
        index = 0;
    }
    index += 1;
    return path.join(dir, "".concat(base + index, ".sock"));
}
exports.nextSocket = nextSocket;
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
exports._defaultHosts = (function () {
    var interfaces = {};
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
    var interfaceNames = Object.keys(interfaces);
    var // !important - dont remove, hence the naming :)
    hiddenButImportantHost = "0.0.0.0";
    var results = [hiddenButImportantHost];
    for (var i = 0; i < interfaceNames.length; i++) {
        var _interface = interfaces[interfaceNames[i]];
        for (var j = 0; j < _interface.length; j++) {
            var curr = _interface[j];
            results.push(curr.address);
        }
    }
    // add null value, For createServer function, do not use host.
    results.push(null);
    debugDefaultHosts("_defaultHosts is: %o", results);
    return results;
})();
