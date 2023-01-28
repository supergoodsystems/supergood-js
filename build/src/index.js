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
Object.defineProperty(exports, "__esModule", { value: true });
const interceptors_1 = require("@mswjs/interceptors");
const node_cache_1 = __importDefault(require("node-cache"));
const node_cleanup_1 = __importDefault(require("node-cleanup"));
const utils_1 = require("./utils");
const api_1 = require("./api");
const node_1 = __importDefault(require("@mswjs/interceptors/lib/presets/node"));
const interceptor = new interceptors_1.BatchInterceptor({
    name: 'supergood-interceptor',
    interceptors: node_1.default
});
const supergood = ({ clientId, clientSecret }, baseUrl = 'https://supergood.ai') => __awaiter(void 0, void 0, void 0, function* () {
    const options = (0, utils_1.getHeaderOptions)(clientId, clientSecret);
    const config = yield (0, api_1.getConfig)(baseUrl, options);
    const eventSinkUrl = config.eventSinkUrl || `${baseUrl}/api/events`;
    // Why two caches? To quickly only flush the cache with
    // completed responses without having to pull all the keys from one
    // cache and filter out the ones without responses.
    const requestCache = new node_cache_1.default({ stdTTL: config.cacheTtl });
    const responseCache = new node_cache_1.default({ stdTTL: config.cacheTtl });
    interceptor.apply();
    interceptor.on('request', (request) => __awaiter(void 0, void 0, void 0, function* () {
        console.log({ baseUrl, url: request.url.origin });
        if (baseUrl !== request.url.origin) {
            const requestBody = yield request.text();
            requestCache.set(request.id, {
                request: {
                    id: request.id,
                    method: request.method,
                    origin: request.url.origin,
                    protocol: request.url.protocol,
                    hostname: request.url.hostname,
                    host: request.url.host,
                    pathname: request.url.pathname,
                    search: request.url.search,
                    requestBody,
                    requestedAt: new Date()
                }
            });
        }
    }));
    interceptor.on('response', (request, response) => __awaiter(void 0, void 0, void 0, function* () {
        if (baseUrl !== request.url.origin) {
            const requestData = requestCache.get(request.id) || {};
            responseCache.set(request.id, Object.assign({ response: {
                    status: response.status,
                    responseBody: response.body,
                    respondedAt: new Date()
                } }, requestData));
            requestCache.del(request.id);
        }
    }));
    // Force flush cache means don't wait for responses
    const flushCache = ({ force } = { force: false }) => __awaiter(void 0, void 0, void 0, function* () {
        // Only flush keys that have a response
        let data = [];
        const responseCacheKeys = responseCache.keys();
        const requestCacheKeys = requestCache.keys();
        if (responseCacheKeys.length === 0 && !force) {
            return;
        }
        // If force, then we need to flush everything, even uncompleted requests
        if (force) {
            const requestArray = Object.values(requestCache.mget(requestCacheKeys));
            const responseArray = Object.values(responseCache.mget(responseCacheKeys));
            data = [...requestArray, ...responseArray];
        }
        try {
            const response = yield (0, api_1.postEvents)(eventSinkUrl, data, options);
            if (!response || response.statusCode !== 200) {
                (0, api_1.dumpDataToDisk)(data); // as backup
            }
        }
        catch (e) {
            (0, api_1.dumpDataToDisk)(data); // as backup
        }
        finally {
            // Delete only the keys sent
            // cache might have been updated
            responseCache.del(responseCacheKeys);
            requestCache.del(requestCacheKeys);
        }
    });
    // Flush cache at a given interval
    // TODO: Perhaps write a check to flush
    // when exceeding a certain POST threshold size?
    const interval = setInterval(flushCache, 1000);
    const close = () => __awaiter(void 0, void 0, void 0, function* () {
        clearInterval(interval);
        interceptor.dispose();
        yield flushCache({ force: true });
    });
    // If program ends abruptly, it'll send out
    // whatever logs it already collected
    // TODO Test Manually with CTRL-C ... can't seem to
    // get this to work with Jest
    (0, node_cleanup_1.default)((exitCode, signal) => {
        if (signal) {
            flushCache({ force: true }).then(() => {
                process.kill(process.pid, signal);
            });
        }
        node_cleanup_1.default.uninstall();
        return false;
    });
    return { requestCache, responseCache, close, flushCache };
});
exports.default = supergood;
