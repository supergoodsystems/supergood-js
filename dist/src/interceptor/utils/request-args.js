"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeClientRequestArgs = void 0;
const http_1 = require("http");
const https_1 = require("https");
const url_1 = require("url");
const getRequestOptionsByUrl_1 = require("./getRequestOptionsByUrl");
const getUrlByRequestOptions_1 = require("./getUrlByRequestOptions");
const cloneObject_1 = require("./cloneObject");
const isObject_1 = require("./isObject");
function resolveRequestOptions(args, url) {
    if (typeof args[1] === 'undefined' || typeof args[1] === 'function') {
        return (0, getRequestOptionsByUrl_1.getRequestOptionsByUrl)(url);
    }
    if (args[1]) {
        const requestOptionsFromUrl = (0, getRequestOptionsByUrl_1.getRequestOptionsByUrl)(url);
        const clonedRequestOptions = (0, cloneObject_1.cloneObject)(args[1]);
        return Object.assign(Object.assign({}, requestOptionsFromUrl), clonedRequestOptions);
    }
    return {};
}
function overrideUrlByRequestOptions(url, options) {
    url.host = options.host || url.host;
    url.hostname = options.hostname || url.hostname;
    url.port = options.port ? options.port.toString() : url.port;
    if (options.path) {
        const parsedOptionsPath = (0, url_1.parse)(options.path, false);
        url.pathname = parsedOptionsPath.pathname || '';
        url.search = parsedOptionsPath.search || '';
    }
    return url;
}
function resolveCallback(args) {
    return typeof args[1] === 'function' ? args[1] : args[2];
}
function normalizeClientRequestArgs(defaultProtocol, ...args) {
    let url;
    let options;
    let callback;
    if (args.length === 0) {
        const url = new URL('http://localhost');
        const options = resolveRequestOptions(args, url);
        return [url, options];
    }
    if (typeof args[0] === 'string') {
        url = new URL(args[0]);
        options = resolveRequestOptions(args, url);
        callback = resolveCallback(args);
    }
    else if (args[0] instanceof URL) {
        url = args[0];
        if (typeof args[1] !== 'undefined' && (0, isObject_1.isObject)(args[1])) {
            url = overrideUrlByRequestOptions(url, args[1]);
        }
        options = resolveRequestOptions(args, url);
        callback = resolveCallback(args);
    }
    else if ('hash' in args[0] && !('method' in args[0])) {
        const [legacyUrl] = args;
        if (legacyUrl.hostname === null) {
            return (0, isObject_1.isObject)(args[1])
                ? normalizeClientRequestArgs(defaultProtocol, Object.assign({ path: legacyUrl.path }, args[1]), args[2])
                : normalizeClientRequestArgs(defaultProtocol, { path: legacyUrl.path }, args[1]);
        }
        const resolvedUrl = new URL(legacyUrl.href);
        return args[1] === undefined
            ? normalizeClientRequestArgs(defaultProtocol, resolvedUrl)
            : typeof args[1] === 'function'
                ? normalizeClientRequestArgs(defaultProtocol, resolvedUrl, args[1])
                : normalizeClientRequestArgs(defaultProtocol, resolvedUrl, args[1], args[2]);
    }
    else if ((0, isObject_1.isObject)(args[0])) {
        options = args[0];
        options.protocol = options.protocol || defaultProtocol;
        url = (0, getUrlByRequestOptions_1.getUrlByRequestOptions)(options);
        callback = resolveCallback(args);
    }
    else {
        throw new Error(`Failed to construct ClientRequest with these parameters: ${args}`);
    }
    options.protocol = options.protocol || url.protocol;
    options.method = options.method || 'GET';
    if (typeof options.agent === 'undefined') {
        const agent = options.protocol === 'https:'
            ? new https_1.Agent({
                rejectUnauthorized: options.rejectUnauthorized
            })
            : new http_1.Agent();
        options.agent = agent;
    }
    if (!options._defaultAgent) {
        options._defaultAgent =
            options.protocol === 'https:' ? https_1.globalAgent : http_1.globalAgent;
    }
    return [url, options, callback];
}
exports.normalizeClientRequestArgs = normalizeClientRequestArgs;
//# sourceMappingURL=request-args.js.map