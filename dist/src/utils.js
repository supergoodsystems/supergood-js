"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseResponseBody = exports.parseAsSSE = exports.expandSensitiveKeySetForArrays = exports.getEndpointConfigForRequest = exports.get = exports.post = exports.sleep = exports.prepareData = exports.safeParseJson = exports.logger = exports.redactValuesFromKeys = exports.redactValue = exports.getHeaderOptions = exports.processRemoteConfig = void 0;
const api_1 = require("./api");
const package_json_1 = require("../package.json");
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const constants_1 = require("./constants");
const lodash_1 = require("lodash");
const constants_2 = require("./constants");
const logger = ({ errorSinkUrl, headerOptions }) => {
    const packageName = package_json_1.name;
    const packageVersion = package_json_1.version;
    return {
        error: (message, payload, error, { reportOut } = { reportOut: true }) => {
            if (process.env.SUPERGOOD_LOG_LEVEL === 'debug') {
                console.error(new Date().toISOString(), `${packageName}@${packageVersion}: ${message}`, JSON.stringify(payload, null, 2), error);
            }
            if (reportOut && errorSinkUrl) {
                (0, api_1.postError)(errorSinkUrl, {
                    payload: Object.assign(Object.assign({}, payload), { packageName, packageVersion }),
                    error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
                    message
                }, headerOptions);
            }
        },
        info: (message, payload) => {
            console.log(new Date().toISOString(), `${packageName}@${packageVersion}: ${message}`, payload !== null && payload !== void 0 ? payload : JSON.stringify(payload, null, 2));
        },
        debug: (message, payload) => {
            if (process.env.SUPERGOOD_LOG_LEVEL === 'debug') {
                console.log(new Date().toISOString(), `${packageName}@${packageVersion}: ${message}`, payload !== null && payload !== void 0 ? payload : JSON.stringify(payload, null, 2));
            }
        }
    };
};
exports.logger = logger;
const getHeaderOptions = (clientId, clientSecret, timeout) => {
    return {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(clientId + ':' + clientSecret).toString('base64')}`
        },
        timeout
    };
};
exports.getHeaderOptions = getHeaderOptions;
const marshalKeyPath = (keypath) => {
    if (/^requestHeaders/.test(keypath))
        return keypath.replace('requestHeaders', 'request.headers');
    if (/^requestBody/.test(keypath))
        return keypath.replace('requestBody', 'request.body');
    if (/^responseHeaders/.test(keypath))
        return keypath.replace('responseHeaders', 'response.headers');
    if (/^responseBody/.test(keypath))
        return keypath.replace('responseBody', 'response.body');
    return keypath;
};
const unmarshalKeyPath = (keypath) => {
    if (/^request\.headers/.test(keypath))
        return keypath.replace('request.headers', 'requestHeaders');
    if (/^request\.body/.test(keypath))
        return keypath.replace('request.body', 'requestBody');
    if (/^response\.headers/.test(keypath))
        return keypath.replace('response.headers', 'responseHeaders');
    if (/^response\.body/.test(keypath))
        return keypath.replace('response.body', 'responseBody');
    return keypath;
};
const expandSensitiveKeySetForArrays = (obj, sensitiveKeys) => {
    const expandKey = (key, obj) => {
        const parts = (key === null || key === void 0 ? void 0 : key.keyPath.match(/[^.\[\]]+|\[\d*\]|\[\*\]/g)) || [];
        return expand(parts, obj, { action: key.action, keyPath: '' });
    };
    const expand = (parts, obj, key) => {
        const path = key.keyPath;
        if (parts.length === 0) {
            return [{ keyPath: path, action: key.action }];
        }
        const part = parts[0];
        const isProperty = !part.startsWith('[');
        const separator = path && isProperty ? '.' : '';
        if (/\[\*?\]/.test(part)) {
            if (!Array.isArray(obj)) {
                return [];
            }
            return obj.flatMap((_, index) => expand(parts.slice(1), obj[index], {
                keyPath: `${path}${separator}[${index}]`,
                action: key.action
            }));
        }
        else if (part.startsWith('[') && part.endsWith(']')) {
            const index = parseInt(part.slice(1, -1), 10);
            if (!isNaN(index) && index < obj.length) {
                return expand(parts.slice(1), obj[index], {
                    keyPath: `${path}${separator}${part}`,
                    action: key.action
                });
            }
            else {
                return [];
            }
        }
        else {
            if (obj && typeof obj === 'object' && part in obj) {
                return expand(parts.slice(1), obj[part], {
                    keyPath: `${path}${separator}${part}`,
                    action: key.action
                });
            }
            else {
                return [];
            }
        }
    };
    return sensitiveKeys.flatMap((key) => expandKey(key, obj));
};
exports.expandSensitiveKeySetForArrays = expandSensitiveKeySetForArrays;
function getKeyPaths(obj, path = '') {
    let paths = [];
    if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((key) => {
            const value = obj[key];
            const newPath = Array.isArray(obj)
                ? `${path}[${key}]`
                : `${path}${path ? '.' : ''}${key}`;
            if (typeof value === 'object' && value !== null) {
                paths = paths.concat(getKeyPaths(value, newPath));
            }
            else {
                paths.push(newPath);
            }
        });
    }
    else {
        paths.push(path);
    }
    return paths;
}
const getAllKeyPathsForLeavesOnEvent = (event) => {
    var _a, _b, _c, _d;
    return [
        ...getKeyPaths((_a = event.request) === null || _a === void 0 ? void 0 : _a.headers, 'request.headers'),
        ...getKeyPaths((_b = event.request) === null || _b === void 0 ? void 0 : _b.body, 'request.body'),
        ...getKeyPaths((_c = event.response) === null || _c === void 0 ? void 0 : _c.headers, 'response.headers'),
        ...getKeyPaths((_d = event.response) === null || _d === void 0 ? void 0 : _d.body, 'response.body')
    ].map((key) => ({ keyPath: key, action: constants_2.SensitiveKeyActions.REDACT }));
};
const redactValuesFromKeys = (event, config) => {
    var _a;
    const { redactByDefault, forceRedactAll } = config;
    const remoteConfig = (config === null || config === void 0 ? void 0 : config.remoteConfig) || {};
    let tags = {};
    let trace;
    if (event.tags) {
        tags = event.tags;
        delete event.tags;
    }
    if (event === null || event === void 0 ? void 0 : event.trace) {
        trace = event.trace;
        delete event.trace;
    }
    let sensitiveKeyMetadata = [];
    const endpointConfig = getEndpointConfigForRequest(event.request, remoteConfig);
    if ((!endpointConfig || !((_a = endpointConfig === null || endpointConfig === void 0 ? void 0 : endpointConfig.sensitiveKeys) === null || _a === void 0 ? void 0 : _a.length)) &&
        !redactByDefault &&
        !forceRedactAll) {
        return { event, sensitiveKeyMetadata, tags, trace };
    }
    else {
        let sensitiveKeys = expandSensitiveKeySetForArrays(event, ((endpointConfig === null || endpointConfig === void 0 ? void 0 : endpointConfig.sensitiveKeys) || []).map((key) => ({
            keyPath: marshalKeyPath(key.keyPath),
            action: key.action
        })));
        if (forceRedactAll) {
            sensitiveKeys = getAllKeyPathsForLeavesOnEvent(event) || [];
        }
        else if (redactByDefault) {
            sensitiveKeys = (getAllKeyPathsForLeavesOnEvent(event) || []).filter((key) => !sensitiveKeys.some((sk) => sk.keyPath === key.keyPath &&
                sk.action === constants_2.SensitiveKeyActions.ALLOW));
        }
        else {
            sensitiveKeys = sensitiveKeys.filter((sk) => sk.action !== constants_2.SensitiveKeyActions.ALLOW);
        }
        for (let i = 0; i < sensitiveKeys.length; i++) {
            const key = sensitiveKeys[i];
            const value = (0, lodash_1.get)(event, key.keyPath);
            if (value) {
                (0, lodash_1.set)(event, key.keyPath, null);
                sensitiveKeyMetadata.push(Object.assign({ keyPath: unmarshalKeyPath(key.keyPath) }, redactValue(value)));
            }
        }
        return { event, sensitiveKeyMetadata, tags, trace };
    }
};
exports.redactValuesFromKeys = redactValuesFromKeys;
const partition = (s, seperator) => {
    const index = s.indexOf(seperator);
    if (index === -1) {
        return [s, '', ''];
    }
    else {
        return [s.slice(0, index), seperator, s.slice(index + seperator.length)];
    }
};
const parseOneAsSSE = (chunk) => {
    const data = [];
    let event;
    let id;
    let retry;
    const splits = chunk.split(/\r?\n/);
    for (let i = 0; i < splits.length; i++) {
        const line = splits[i];
        if (line === '') {
            return {
                event,
                id,
                data,
                retry
            };
        }
        if (line.startsWith(':')) {
            return null;
        }
        let [fieldName, separator, value] = partition(line, ':');
        if (separator === '') {
            return null;
        }
        value = value.trimStart();
        switch (fieldName) {
            case 'event':
                event = value;
                break;
            case 'data':
                data.push(safeParseJson(value));
                break;
            case 'id':
                if (!value.includes('\0')) {
                    id = value;
                }
                break;
            case 'retry':
                retry = safeParseInt(value);
                break;
        }
    }
    return null;
};
const parseAsSSE = (stream) => {
    const splits = stream.split(/(?<=\n)/);
    if (splits.length === 0) {
        return null;
    }
    let data = '';
    const responseBody = splits
        .map((split) => {
        data += split;
        if (data.endsWith('\n\n') ||
            data.endsWith('\r\r') ||
            data.endsWith('\r\n\r\n')) {
            const sse = parseOneAsSSE(data);
            if (sse) {
                data = '';
                return sse;
            }
        }
    })
        .filter((sse) => !!sse);
    return (responseBody === null || responseBody === void 0 ? void 0 : responseBody.length) ? responseBody : null;
};
exports.parseAsSSE = parseAsSSE;
const safeParseJson = (json) => {
    try {
        return JSON.parse(json);
    }
    catch (e) {
        return json;
    }
};
exports.safeParseJson = safeParseJson;
const safeParseInt = (int) => {
    try {
        const parsed = parseInt(int, 10);
        if (!isNaN(parsed)) {
            return int;
        }
    }
    finally {
        return null;
    }
};
const parseResponseBody = (rawResponseBody, contentType) => {
    if (contentType === null || contentType === void 0 ? void 0 : contentType.includes(constants_1.ContentType.EventStream)) {
        return parseAsSSE(rawResponseBody);
    }
    else {
        return safeParseJson(rawResponseBody);
    }
};
exports.parseResponseBody = parseResponseBody;
const redactValue = (input) => {
    let dataLength;
    let dataType;
    if (!input) {
        dataLength = 0;
        dataType = 'null';
    }
    else if (Array.isArray(input)) {
        dataLength = input.length;
        dataType = 'array';
    }
    else if (typeof input === 'object') {
        dataLength = new Blob([JSON.stringify(input)]).size;
        dataType = 'object';
    }
    else if (typeof input === 'string') {
        dataLength = input.length;
        dataType = 'string';
    }
    else if (typeof input === 'number') {
        dataLength = input.toString().length;
        dataType = Number.isInteger(input) ? 'integer' : 'float';
    }
    else if (typeof input === 'boolean') {
        dataLength = 1;
        dataType = 'boolean';
    }
    return { length: dataLength, type: dataType };
};
exports.redactValue = redactValue;
const prepareData = (events, supergoodConfig) => {
    return events.map((e) => {
        const { event, sensitiveKeyMetadata, tags, trace } = redactValuesFromKeys(e, supergoodConfig);
        return Object.assign(Object.assign({}, event), { metadata: { sensitiveKeys: sensitiveKeyMetadata, tags, trace } });
    });
};
exports.prepareData = prepareData;
const getByteSize = (s) => {
    return new TextEncoder().encode(s).length;
};
const post = (url, data, authorization, timeout) => {
    const dataString = JSON.stringify(data);
    const packageVersion = package_json_1.version;
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': getByteSize(dataString),
            Authorization: authorization,
            'supergood-api': 'supergood-js',
            'supergood-api-version': packageVersion
        },
        timeout
    };
    return new Promise((resolve, reject) => {
        const transport = url.startsWith('https') ? https_1.default : http_1.default;
        const req = transport.request(url, options, (res) => {
            if (res && res.statusCode) {
                if (res.statusCode === 401) {
                    return reject(new Error(constants_1.errors.UNAUTHORIZED));
                }
                if (res.statusCode < 200 || res.statusCode > 299) {
                    return reject(new Error(`HTTP status code ${res.statusCode}`));
                }
            }
            const body = [];
            res.on('data', (chunk) => body.push(chunk));
            res.on('end', () => {
                const resString = Buffer.concat(body).toString();
                resolve(resString);
            });
        });
        req.on('error', (err) => {
            reject(err);
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request time out'));
        });
        req.write(dataString);
        req.end();
    });
};
exports.post = post;
const get = (url, authorization, timeout) => {
    const packageVersion = package_json_1.version;
    const options = {
        method: 'GET',
        headers: {
            Authorization: authorization,
            'supergood-api': 'supergood-js',
            'supergood-api-version': packageVersion
        },
        timeout
    };
    return new Promise((resolve, reject) => {
        const transport = url.startsWith('https') ? https_1.default : http_1.default;
        const req = transport.request(url, options, (res) => {
            if (res && res.statusCode) {
                if (res.statusCode === 401) {
                    return reject(new Error(constants_1.errors.UNAUTHORIZED));
                }
                if (res.statusCode < 200 || res.statusCode > 299) {
                    return reject(new Error(`HTTP status code ${res.statusCode}`));
                }
            }
            const body = [];
            res.on('data', (chunk) => body.push(chunk));
            res.on('end', () => {
                const resString = Buffer.concat(body).toString();
                resolve(resString);
            });
        });
        req.on('error', (err) => {
            reject(err);
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request time out'));
        });
        req.end();
    });
};
exports.get = get;
const processRemoteConfig = (remoteConfigPayload) => {
    const endpointConfig = ((remoteConfigPayload === null || remoteConfigPayload === void 0 ? void 0 : remoteConfigPayload.endpointConfig) || []).reduce((remoteConfig, domainConfig) => {
        const { domain, endpoints } = domainConfig;
        const endpointConfig = endpoints.reduce((endpointConfig, endpoint) => {
            const { matchingRegex, endpointConfiguration, method } = endpoint;
            const { regex, location } = matchingRegex;
            const { action, sensitiveKeys } = endpointConfiguration;
            endpointConfig[regex] = {
                location,
                regex,
                method,
                ignored: action === constants_2.EndpointActions.IGNORE,
                sensitiveKeys: (sensitiveKeys || []).map((key) => ({
                    keyPath: key.keyPath,
                    action: key.action
                }))
            };
            return endpointConfig;
        }, {});
        remoteConfig[domain] = endpointConfig;
        return remoteConfig;
    }, {});
    return {
        endpointConfig,
        proxyConfig: (remoteConfigPayload === null || remoteConfigPayload === void 0 ? void 0 : remoteConfigPayload.proxyConfig) || {
            vendorCredentialConfig: {}
        }
    };
};
exports.processRemoteConfig = processRemoteConfig;
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const getStrRepresentationFromPath = (request, location) => {
    var _a, _b;
    const url = new URL(request.url);
    if (location === 'domain')
        return url.hostname.toString();
    if (location === 'url')
        return url.toString();
    if (location === 'path')
        return url.pathname.toString();
    if (location === 'requestHeaders')
        return request.headers.toString();
    if (location === 'requestBody')
        return (_a = request.body) === null || _a === void 0 ? void 0 : _a.toString();
    return (_b = request[location]) === null || _b === void 0 ? void 0 : _b.toString();
};
const getEndpointConfigForRequest = (request, remoteConfig) => {
    const domains = Object.keys(remoteConfig);
    const domain = domains.find((domain) => request.url.includes(domain));
    if (!domain)
        return null;
    const endpointConfigs = remoteConfig[domain];
    for (let i = 0; i < Object.keys(endpointConfigs).length; i++) {
        const endpointConfig = endpointConfigs[Object.keys(endpointConfigs)[i]];
        const { regex, location, method } = endpointConfig;
        if (request.method.toLocaleLowerCase() !== method.toLocaleLowerCase()) {
            continue;
        }
        const regexObj = new RegExp(regex);
        const strRepresentation = getStrRepresentationFromPath(request, location);
        if (!strRepresentation)
            continue;
        else {
            const match = regexObj.test(strRepresentation);
            if (match) {
                return endpointConfig;
            }
        }
    }
    return null;
};
exports.getEndpointConfigForRequest = getEndpointConfigForRequest;
//# sourceMappingURL=utils.js.map