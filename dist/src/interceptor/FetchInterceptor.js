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
exports.FetchInterceptor = void 0;
const crypto_1 = __importDefault(require("crypto"));
const IsomorphicRequest_1 = require("./utils/IsomorphicRequest");
const IsomorphicResponse_1 = require("./utils/IsomorphicResponse");
const isInterceptable_1 = require("./utils/isInterceptable");
const proxyUtils_1 = require("./utils/proxyUtils");
const Interceptor_1 = require("./Interceptor");
class FetchInterceptor extends Interceptor_1.Interceptor {
    constructor(options) {
        super(options);
    }
    static checkEnvironment() {
        return (typeof globalThis !== 'undefined' &&
            typeof globalThis.fetch !== 'undefined');
    }
    setup({ isWithinContext }) {
        const pureFetch = globalThis.fetch;
        globalThis.fetch = (input, init) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const requestId = crypto_1.default.randomUUID();
            let request = new Request(input, init);
            const requestURL = new URL(request.url);
            const _isInterceptable = (0, isInterceptable_1.isInterceptable)({
                url: requestURL,
                ignoredDomains: (_a = this.options.ignoredDomains) !== null && _a !== void 0 ? _a : [],
                allowedDomains: (_b = this.options.allowedDomains) !== null && _b !== void 0 ? _b : [],
                baseUrl: (_c = this.options.baseUrl) !== null && _c !== void 0 ? _c : '',
                allowLocalUrls: (_d = this.options.allowLocalUrls) !== null && _d !== void 0 ? _d : false,
                allowIpAddresses: (_e = this.options.allowIpAddresses) !== null && _e !== void 0 ? _e : false,
                isWithinContext: isWithinContext !== null && isWithinContext !== void 0 ? isWithinContext : (() => true)
            });
            if (_isInterceptable) {
                const isomorphicRequest = yield IsomorphicRequest_1.IsomorphicRequest.fromFetchRequest(request);
                this.emitter.emit('request', isomorphicRequest, requestId);
            }
            if ((0, proxyUtils_1.shouldProxyRequest)(requestURL, this.options.proxyConfig)) {
                request = modifyRequest(request, requestURL, (_f = this.options) === null || _f === void 0 ? void 0 : _f.proxyConfig);
            }
            return pureFetch(request).then((response) => __awaiter(this, void 0, void 0, function* () {
                if (_isInterceptable) {
                    const isomorphicResponse = yield IsomorphicResponse_1.IsomorphicResponse.fromFetchResponse(response);
                    this.emitter.emit('response', isomorphicResponse, requestId);
                }
                return response;
            }));
        });
        this.subscriptions.push(() => {
            globalThis.fetch = pureFetch;
        });
    }
}
exports.FetchInterceptor = FetchInterceptor;
const modifyRequest = (originalRequest, originalRequestURL, proxyConfig) => {
    const headers = originalRequest.headers;
    headers.set(proxyUtils_1.SupergoodProxyHeaders.upstreamHeader, originalRequestURL.protocol + '//' + originalRequestURL.host);
    headers.set(proxyUtils_1.SupergoodProxyHeaders.clientId, (proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.clientId) || '');
    headers.set(proxyUtils_1.SupergoodProxyHeaders.clientSecret, (proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.clientSecret) || '');
    const proxyURL = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL;
    proxyURL.pathname = originalRequestURL.pathname;
    proxyURL.search = originalRequestURL.search;
    return new Request(proxyURL, { headers });
};
//# sourceMappingURL=FetchInterceptor.js.map