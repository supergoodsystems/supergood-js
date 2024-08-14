"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_cache_1 = __importDefault(require("node-cache"));
const v8_1 = require("v8");
const utils_1 = require("./utils");
const api_1 = require("./api");
const constants_1 = require("./constants");
const signal_exit_1 = __importDefault(require("signal-exit"));
const NodeRequestInterceptor_1 = require("./interceptor/NodeRequestInterceptor");
const BatchInterceptor_1 = require("./interceptor/BatchInterceptor");
const FetchInterceptor_1 = require("./interceptor/FetchInterceptor");
const async_hooks_1 = require("async_hooks");
const crypto_1 = __importDefault(require("crypto"));
const supergoodAsyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
const Supergood = () => {
    let eventSinkUrl;
    let errorSinkUrl;
    let remoteConfigFetchUrl;
    let telemetryUrl;
    let headerOptions;
    let supergoodConfig;
    let supergoodMetadata;
    let supergoodTags;
    let supergoodTrace;
    let requestCache;
    let responseCache;
    let log;
    let flushInterval;
    let remoteConfigFetchInterval;
    let localOnly = false;
    let interceptor;
    const init = ({ clientId, clientSecret, config, metadata, tags, trace, isWithinContext } = {
        clientId: process.env.SUPERGOOD_CLIENT_ID,
        clientSecret: process.env.SUPERGOOD_CLIENT_SECRET,
        config: {},
        metadata: {},
        tags: {},
        isWithinContext: () => true
    }, baseUrl = process.env.SUPERGOOD_BASE_URL || 'https://api.supergood.ai', baseTelemetryUrl = process.env.SUPERGOOD_TELEMETRY_BASE_URL ||
        'https://telemetry.supergood.ai', baseProxyURL = process.env.SUPERGOOD_PROXY_BASE_URL ||
        'https://proxy.supergood.ai') => {
        var _a, _b;
        if (!clientId)
            throw new Error(constants_1.errors.NO_CLIENT_ID);
        if (!clientSecret)
            throw new Error(constants_1.errors.NO_CLIENT_SECRET);
        if (clientId === constants_1.LocalClientId || clientSecret === constants_1.LocalClientSecret) {
            localOnly = true;
        }
        supergoodConfig = Object.assign(Object.assign({}, constants_1.defaultConfig), config);
        supergoodMetadata = metadata;
        requestCache =
            requestCache !== null && requestCache !== void 0 ? requestCache : new node_cache_1.default({
                stdTTL: 0,
                useClones: false
            });
        responseCache =
            responseCache !== null && responseCache !== void 0 ? responseCache : new node_cache_1.default({
                stdTTL: 0,
                useClones: false
            });
        supergoodTags = tags !== null && tags !== void 0 ? tags : {};
        supergoodTrace = trace;
        const interceptorOpts = {
            allowedDomains: supergoodConfig.allowedDomains,
            ignoredDomains: supergoodConfig.ignoredDomains,
            allowLocalUrls: supergoodConfig.allowLocalUrls,
            allowIpAddresses: supergoodConfig.allowIpAddresses,
            proxyConfig: supergoodConfig.proxyConfig,
            baseUrl
        };
        interceptor = new BatchInterceptor_1.BatchInterceptor([
            new NodeRequestInterceptor_1.NodeRequestInterceptor(interceptorOpts),
            ...(FetchInterceptor_1.FetchInterceptor.checkEnvironment()
                ? [new FetchInterceptor_1.FetchInterceptor(interceptorOpts)]
                : [])
        ]);
        eventSinkUrl = `${baseUrl}${supergoodConfig.eventSinkEndpoint}`;
        remoteConfigFetchUrl = `${baseUrl}${supergoodConfig.remoteConfigFetchEndpoint}`;
        telemetryUrl = `${baseTelemetryUrl}${supergoodConfig.telemetryEndpoint}`;
        errorSinkUrl = `${baseTelemetryUrl}${supergoodConfig.errorSinkEndpoint}`;
        headerOptions = (0, utils_1.getHeaderOptions)(clientId, clientSecret, supergoodConfig.timeout);
        log = (0, utils_1.logger)({ errorSinkUrl, headerOptions });
        const fetchAndProcessRemoteConfig = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const remoteConfigPayload = yield (0, api_1.fetchRemoteConfig)(remoteConfigFetchUrl, headerOptions);
                const { endpointConfig, proxyConfig } = (0, utils_1.processRemoteConfig)(remoteConfigPayload);
                supergoodConfig.remoteConfig = endpointConfig;
                supergoodConfig.proxyConfig.vendorCredentialConfig =
                    proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.vendorCredentialConfig;
                supergoodConfig.proxyConfig.proxyURL = new URL(baseProxyURL);
                supergoodConfig.proxyConfig.clientId = clientId;
                supergoodConfig.proxyConfig.clientSecret = clientSecret;
            }
            catch (e) {
                log.error(constants_1.errors.FETCHING_CONFIG, { config: supergoodConfig }, e);
            }
        });
        const initializeInterceptors = () => {
            isWithinContext = isWithinContext !== null && isWithinContext !== void 0 ? isWithinContext : (() => true);
            interceptor.setup({ isWithinContext });
            interceptor.on('request', (request, requestId) => __awaiter(void 0, void 0, void 0, function* () {
                if (!supergoodConfig.remoteConfig)
                    return;
                try {
                    const url = new URL(request.url);
                    if (url.pathname === constants_1.TestErrorPath) {
                        throw new Error(constants_1.errors.TEST_ERROR);
                    }
                    const body = yield request.clone().text();
                    const requestData = {
                        id: requestId,
                        headers: supergoodConfig.logRequestHeaders
                            ? Object.fromEntries(request.headers.entries())
                            : {},
                        method: request.method,
                        url: url.href,
                        path: url.pathname,
                        search: url.search,
                        body: supergoodConfig.logRequestBody ? (0, utils_1.safeParseJson)(body) : {},
                        requestedAt: new Date()
                    };
                    const endpointConfig = (0, utils_1.getEndpointConfigForRequest)(requestData, supergoodConfig.remoteConfig);
                    if (endpointConfig === null || endpointConfig === void 0 ? void 0 : endpointConfig.ignored)
                        return;
                    cacheRequest(requestData, baseUrl);
                }
                catch (e) {
                    log.error(constants_1.errors.CACHING_REQUEST, {
                        config: supergoodConfig,
                        metadata: Object.assign({ requestUrl: request.url.toString(), size: (0, v8_1.serialize)(request).length }, supergoodMetadata)
                    }, e, {
                        reportOut: !localOnly
                    });
                }
            }));
            interceptor.on('response', (response, requestId) => __awaiter(void 0, void 0, void 0, function* () {
                var _a;
                let requestData = { url: '' };
                let responseData = {};
                if (!supergoodConfig.remoteConfig)
                    return;
                try {
                    const requestData = requestCache.get(requestId);
                    if (requestData) {
                        const endpointConfig = (0, utils_1.getEndpointConfigForRequest)(requestData.request, supergoodConfig.remoteConfig);
                        if (endpointConfig === null || endpointConfig === void 0 ? void 0 : endpointConfig.ignored)
                            return;
                        const contentType = (_a = response.headers.get('content-type')) !== null && _a !== void 0 ? _a : constants_1.ContentType.Text;
                        const responseData = Object.assign({ response: {
                                headers: supergoodConfig.logResponseHeaders
                                    ? Object.fromEntries(response.headers.entries())
                                    : {},
                                status: response.status,
                                statusText: response.statusText,
                                body: supergoodConfig.logResponseBody
                                    ? (0, utils_1.parseResponseBody)(response.body, contentType)
                                    : {},
                                respondedAt: new Date()
                            } }, requestData);
                        cacheResponse(responseData, baseUrl);
                    }
                }
                catch (e) {
                    log.error(constants_1.errors.CACHING_RESPONSE, {
                        config: supergoodConfig,
                        metadata: Object.assign({ requestUrl: requestData.url, size: responseData ? (0, v8_1.serialize)(responseData).length : 0 }, supergoodMetadata)
                    }, e);
                }
            }));
        };
        const continuation = supergoodConfig.useRemoteConfig
            ? fetchAndProcessRemoteConfig()
            : void (supergoodConfig.remoteConfig =
                (_a = supergoodConfig.remoteConfig) !== null && _a !== void 0 ? _a : {});
        const remainingWork = () => {
            initializeInterceptors();
            if (supergoodConfig.useRemoteConfig && !remoteConfigFetchInterval) {
                remoteConfigFetchInterval = setInterval(fetchAndProcessRemoteConfig, supergoodConfig.remoteConfigFetchInterval);
                remoteConfigFetchInterval.unref();
            }
            if (!flushInterval) {
                flushInterval = setInterval(flushCache, supergoodConfig.flushInterval);
                flushInterval.unref();
            }
        };
        return ((_b = continuation === null || continuation === void 0 ? void 0 : continuation.then(remainingWork)) !== null && _b !== void 0 ? _b : remainingWork());
    };
    const cacheRequest = (request, baseUrl) => __awaiter(void 0, void 0, void 0, function* () {
        requestCache.set(request.id, {
            request,
            tags: getTags(),
            trace: getTrace()
        });
        log.debug('Setting Request Cache', {
            request,
            tags: getTags(),
            trace: getTrace()
        });
    });
    const cacheResponse = (event, baseUrl) => __awaiter(void 0, void 0, void 0, function* () {
        responseCache.set(event.request.id, event);
        log.debug('Setting Response Cache', Object.assign({ id: event.request.id }, event));
        requestCache.del(event.request.id);
        log.debug('Deleting Request Cache', { id: event.request.id });
    });
    const getTags = () => {
        var _a;
        return Object.assign(Object.assign({}, supergoodTags), (((_a = supergoodAsyncLocalStorage.getStore()) === null || _a === void 0 ? void 0 : _a.tags) || {}));
    };
    const getTrace = () => {
        var _a;
        return ((_a = supergoodAsyncLocalStorage.getStore()) === null || _a === void 0 ? void 0 : _a.trace) || supergoodTrace;
    };
    const flushCache = ({ force } = { force: false }) => __awaiter(void 0, void 0, void 0, function* () {
        if (!responseCache || !requestCache) {
            return;
        }
        const responseCacheKeys = responseCache.keys();
        const requestCacheKeys = requestCache.keys();
        const responseCacheValues = Object.values(responseCache.mget(responseCacheKeys));
        const requestCacheValues = Object.values(requestCache.mget(requestCacheKeys));
        const { keys, vsize } = responseCache.getStats();
        responseCache.del(responseCacheKeys);
        if (force)
            requestCache.del(requestCacheKeys);
        const responseArray = (0, utils_1.prepareData)(responseCacheValues, supergoodConfig);
        let data = [...responseArray];
        if (force) {
            const requestArray = (0, utils_1.prepareData)(requestCacheValues, supergoodConfig);
            data = [...requestArray, ...responseArray];
        }
        if (data.length === 0) {
            return;
        }
        try {
            if (supergoodConfig.useTelemetry) {
                yield (0, api_1.postTelemetry)(telemetryUrl, Object.assign({ cacheKeys: keys, cacheSize: vsize }, supergoodMetadata), headerOptions);
            }
        }
        catch (e) {
            const error = e;
            log.error(constants_1.errors.POSTING_TELEMETRY, {
                config: supergoodConfig,
                metadata: Object.assign({ keys, size: vsize }, supergoodMetadata)
            }, error, {
                reportOut: !localOnly
            });
        }
        try {
            if (localOnly) {
                log.debug(JSON.stringify(data, null, 2), { force });
            }
            else {
                yield (0, api_1.postEvents)(eventSinkUrl, data, headerOptions);
            }
            if (data.length) {
                log.debug(`Flushed ${data.length} events`, { force });
            }
        }
        catch (e) {
            const error = e;
            if (error.message === constants_1.errors.UNAUTHORIZED) {
                log.error(constants_1.errors.UNAUTHORIZED, { config: supergoodConfig, metadata: Object.assign({}, supergoodMetadata) }, error, {
                    reportOut: false
                });
                clearInterval(flushInterval);
                clearInterval(remoteConfigFetchInterval);
                interceptor.teardown();
            }
            else {
                log.error(constants_1.errors.POSTING_EVENTS, {
                    config: supergoodConfig,
                    metadata: Object.assign({ keys: data.length, size: (0, v8_1.serialize)(data).length }, supergoodMetadata)
                }, error, {
                    reportOut: !localOnly
                });
            }
        }
    });
    const close = (force = true) => __awaiter(void 0, void 0, void 0, function* () {
        clearInterval(flushInterval);
        clearInterval(remoteConfigFetchInterval);
        if ((requestCache === null || requestCache === void 0 ? void 0 : requestCache.keys().length) > 0) {
            yield (0, utils_1.sleep)(supergoodConfig.waitAfterClose);
        }
        interceptor === null || interceptor === void 0 ? void 0 : interceptor.teardown();
        yield flushCache({ force });
        return false;
    });
    const waitAndFlushCache = ({ force } = { force: false }) => __awaiter(void 0, void 0, void 0, function* () {
        if ((requestCache === null || requestCache === void 0 ? void 0 : requestCache.keys().length) > 0) {
            yield (0, utils_1.sleep)(supergoodConfig.waitAfterClose);
        }
        yield flushCache({ force });
    });
    const withTags = (options, fn) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const existingTags = ((_a = supergoodAsyncLocalStorage.getStore()) === null || _a === void 0 ? void 0 : _a.tags) || {};
        const existingTrace = (_b = supergoodAsyncLocalStorage.getStore()) === null || _b === void 0 ? void 0 : _b.trace;
        return supergoodAsyncLocalStorage.run({
            tags: Object.assign(Object.assign({}, ((options === null || options === void 0 ? void 0 : options.tags) || {})), existingTags),
            trace: (options === null || options === void 0 ? void 0 : options.trace) || existingTrace
        }, fn);
    });
    const withCapture = ({ clientId, clientSecret, config, tags, trace, baseUrl, baseTelemetryUrl }, fn) => __awaiter(void 0, void 0, void 0, function* () {
        const instanceId = crypto_1.default.randomUUID();
        return supergoodAsyncLocalStorage.run({ tags, instanceId, trace }, () => __awaiter(void 0, void 0, void 0, function* () {
            yield init({
                clientId,
                clientSecret,
                config,
                tags,
                trace,
                isWithinContext: () => { var _a; return ((_a = supergoodAsyncLocalStorage.getStore()) === null || _a === void 0 ? void 0 : _a.instanceId) === instanceId; }
            }, baseUrl, baseTelemetryUrl);
            return fn();
        }));
    });
    const startCapture = ({ clientId, clientSecret, config, tags, trace, baseUrl, baseTelemetryUrl }) => {
        const instanceId = crypto_1.default.randomUUID();
        supergoodAsyncLocalStorage.enterWith({ instanceId, tags, trace });
        return init({
            clientId,
            clientSecret,
            config,
            tags,
            trace,
            isWithinContext: () => { var _a; return ((_a = supergoodAsyncLocalStorage.getStore()) === null || _a === void 0 ? void 0 : _a.instanceId) === instanceId; }
        }, baseUrl, baseTelemetryUrl);
    };
    const stopCapture = () => {
        supergoodAsyncLocalStorage.disable();
    };
    const getAsyncLocalStorage = () => supergoodAsyncLocalStorage.getStore();
    (0, signal_exit_1.default)(() => close(), { alwaysLast: true });
    return {
        close,
        flushCache,
        waitAndFlushCache,
        withTags,
        init,
        withCapture,
        startCapture,
        stopCapture,
        getAsyncLocalStorage
    };
};
module.exports = Supergood();
//# sourceMappingURL=index.js.map