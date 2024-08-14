"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUrlByRequestOptions = exports.DEFAULT_PATH = void 0;
const http_1 = require("http");
exports.DEFAULT_PATH = '/';
const DEFAULT_PROTOCOL = 'http:';
const DEFAULT_HOST = 'localhost';
const SSL_PORT = 443;
function getAgent(options) {
    return options.agent instanceof http_1.Agent ? options.agent : undefined;
}
function getProtocolByRequestOptions(options) {
    var _a;
    if (options.protocol) {
        return options.protocol;
    }
    const agent = getAgent(options);
    const agentProtocol = agent === null || agent === void 0 ? void 0 : agent.protocol;
    if (agentProtocol) {
        return agentProtocol;
    }
    const port = getPortByRequestOptions(options);
    const isSecureRequest = options.cert || port === SSL_PORT;
    return isSecureRequest ? 'https:' : ((_a = options.uri) === null || _a === void 0 ? void 0 : _a.protocol) || DEFAULT_PROTOCOL;
}
function getPortByRequestOptions(options) {
    if (options.port) {
        return Number(options.port);
    }
    if (options.hostname != null) {
        const [, extractedPort] = options.hostname.match(/:(\d+)$/) || [];
        if (extractedPort != null) {
            return Number(extractedPort);
        }
    }
    const agent = getAgent(options);
    if (agent === null || agent === void 0 ? void 0 : agent.options.port) {
        return Number(agent.options.port);
    }
    if (agent === null || agent === void 0 ? void 0 : agent.defaultPort) {
        return Number(agent.defaultPort);
    }
    return undefined;
}
function getHostByRequestOptions(options) {
    const { hostname, host } = options;
    if (hostname != null) {
        return hostname.replace(/:\d+$/, '');
    }
    return host || DEFAULT_HOST;
}
function getAuthByRequestOptions(options) {
    if (options.auth) {
        const [username, password] = options.auth.split(':');
        return { username, password };
    }
}
function isRawIPv6Address(host) {
    return host.includes(':') && !host.startsWith('[') && !host.endsWith(']');
}
function getHostname(host, port) {
    const portString = typeof port !== 'undefined' ? `:${port}` : '';
    if (isRawIPv6Address(host)) {
        return `[${host}]${portString}`;
    }
    if (typeof port === 'undefined') {
        return host;
    }
    return `${host}${portString}`;
}
function getUrlByRequestOptions(options) {
    if (options.uri) {
        return new URL(options.uri.href);
    }
    const protocol = getProtocolByRequestOptions(options);
    const host = getHostByRequestOptions(options);
    const port = getPortByRequestOptions(options);
    const hostname = getHostname(host, port);
    const path = options.path || exports.DEFAULT_PATH;
    const credentials = getAuthByRequestOptions(options);
    const url = new URL(`${protocol}//${hostname}${path}`);
    url.username = (credentials === null || credentials === void 0 ? void 0 : credentials.username) || '';
    url.password = (credentials === null || credentials === void 0 ? void 0 : credentials.password) || '';
    return url;
}
exports.getUrlByRequestOptions = getUrlByRequestOptions;
//# sourceMappingURL=getUrlByRequestOptions.js.map