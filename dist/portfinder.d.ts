/// <reference types="node" />
import * as net from "net";
import mkdirp from "mkdirp";
interface ErrnoException extends Error {
    errno?: number;
    code?: string;
    path?: string;
    syscall?: string;
    stack?: string;
}
declare type MaybeErr = ErrnoException | undefined | null;
interface CallBack<T> {
    (error: MaybeErr): void;
    (error: ErrnoException): void;
    (error: ErrnoException, result: undefined): void;
    (error: undefined, result: T): void;
    (error: null, result: T): void;
}
declare type GetSocketCallback = CallBack<string>;
declare type PortfinderCallback = CallBack<number>;
declare type GetPortsCallback = CallBack<(number | undefined)[]>;
interface PortFinderOptions {
    /**
     * Host to find available port on.
     */
    host?: string | null;
    /**
     * search start port (equals to port when not provided)
     * This exists because getPort and getPortPromise mutates port state in
     * recursive calls and doesn't have a way to retrieve begininng port while
     * searching.
     */
    startPort?: number;
    /**
     * Minimum port (takes precedence over `basePort`).
     */
    port?: number;
    /**
     * Maximum port
     */
    stopPort?: number;
    server?: net.Server;
}
/**
 * The lowest port to begin any port search from.
 */
export declare let basePort: number;
/**
 * Set the lowest port to begin any port search from.
 */
export declare function setBasePort(port: number): void;
/**
 * The highest port to end any port search from.
 */
export declare let highestPort: number;
/**
 * Set the higheset port to end any port search from.
 */
export declare function setHighestPort(port: number): void;
export declare const basePath = "/tmp/portfinder";
export declare function getPort(callback: PortfinderCallback): void;
export declare function getPort(options: PortFinderOptions, callback: PortfinderCallback): void;
export declare function getPortPromise(options: PortFinderOptions): Promise<number>;
export declare function getPorts(count: number, _options: PortfinderCallback | GetPortsCallback, callback?: GetPortsCallback): void;
interface GetSocketOptions {
    mod?: mkdirp.Mode;
    path?: string;
    exists?: boolean;
}
export declare function getSocket(_options: GetSocketOptions | GetSocketCallback, callback?: GetSocketCallback): void;
export declare function nextPort(port: number): number;
export declare function nextSocket(socketPath: string): string;
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
export declare const _defaultHosts: (string | null)[];
export {};
