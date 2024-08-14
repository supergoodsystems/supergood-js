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
exports.NodeClientRequest = void 0;
const http_1 = require("http");
const crypto_1 = __importDefault(require("crypto"));
const headers_polyfill_1 = require("headers-polyfill");
const normalizeClientRequestWriteArgs_1 = require("./utils/normalizeClientRequestWriteArgs");
const IsomorphicRequest_1 = require("./utils/IsomorphicRequest");
const bufferUtils_1 = require("./utils/bufferUtils");
const isInterceptable_1 = require("./utils/isInterceptable");
const IsomorphicResponse_1 = require("./utils/IsomorphicResponse");
const cloneIncomingMessage_1 = require("./utils/cloneIncomingMessage");
const proxyUtils_1 = require("./utils/proxyUtils");
class NodeClientRequest extends http_1.ClientRequest {
    constructor([url, requestOptions, callback], options) {
        var _a, _b, _c, _d, _e, _f;
        const tmpURL = new URL(url);
        if ((0, proxyUtils_1.shouldProxyRequest)(url, options.proxyConfig)) {
            requestOptions = modifyRequestOptionsWithProxyConfig(requestOptions, url, options === null || options === void 0 ? void 0 : options.proxyConfig);
            console.log('HERE');
            console.log(requestOptions);
        }
        super(requestOptions, callback);
        this.requestId = null;
        this.requestId = crypto_1.default.randomUUID();
        this.url = url;
        this.emitter = options.emitter;
        this.requestBuffer = null;
        this.isInterceptable = (0, isInterceptable_1.isInterceptable)({
            url: this.url,
            ignoredDomains: (_a = options.ignoredDomains) !== null && _a !== void 0 ? _a : [],
            allowedDomains: (_b = options.allowedDomains) !== null && _b !== void 0 ? _b : [],
            baseUrl: (_c = options.baseUrl) !== null && _c !== void 0 ? _c : '',
            allowLocalUrls: (_d = options.allowLocalUrls) !== null && _d !== void 0 ? _d : false,
            allowIpAddresses: (_e = options.allowIpAddresses) !== null && _e !== void 0 ? _e : false,
            isWithinContext: (_f = options.isWithinContext) !== null && _f !== void 0 ? _f : (() => true)
        });
        if ((0, proxyUtils_1.shouldProxyRequest)(this.url, options === null || options === void 0 ? void 0 : options.proxyConfig)) {
            this.modifyRequestWithProxyConfig(tmpURL, options === null || options === void 0 ? void 0 : options.proxyConfig);
        }
    }
    modifyRequestWithProxyConfig(tmpUrl, proxyConfig) {
        var _a;
        this.originalUrl = tmpUrl;
        this.setHeader(proxyUtils_1.SupergoodProxyHeaders.upstreamHeader, this.url.protocol + '//' + this.url.host);
        this.setHeader(proxyUtils_1.SupergoodProxyHeaders.clientId, (proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.clientId) || '');
        this.setHeader(proxyUtils_1.SupergoodProxyHeaders.clientSecret, (proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.clientSecret) || '');
        this.setHeader('host', ((_a = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL) === null || _a === void 0 ? void 0 : _a.host) || '');
        if (proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL) {
            this.url.protocol = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL.protocol;
            this.url.hostname = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL.hostname;
            this.url.host = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL.host;
            this.url.protocol = proxyConfig.proxyURL.protocol;
            this.url.port = proxyConfig.proxyURL.port;
        }
    }
    writeRequestBodyChunk(chunk, encoding) {
        if (chunk == null) {
            return;
        }
        if (this.requestBuffer == null) {
            this.requestBuffer = Buffer.from([]);
        }
        const resolvedChunk = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk, encoding);
        this.requestBuffer = Buffer.concat([this.requestBuffer, resolvedChunk]);
    }
    write(...args) {
        const [chunk, encoding, callback] = (0, normalizeClientRequestWriteArgs_1.normalizeClientRequestWriteArgs)(args);
        this.writeRequestBodyChunk(chunk, encoding);
        return super.write(chunk, encoding, callback);
    }
    end(chunk, encoding, cb) {
        var _a;
        if (this.isInterceptable) {
            const requestBody = (0, bufferUtils_1.getArrayBuffer)((_a = this.requestBuffer) !== null && _a !== void 0 ? _a : Buffer.from([]));
            this.emitter.emit('request', this.toIsomorphicRequest(requestBody), this.requestId);
        }
        return super.end(chunk, encoding, cb);
    }
    emit(event, ...args) {
        if (event === 'response' && this.isInterceptable) {
            try {
                const response = args[0];
                const firstClone = (0, cloneIncomingMessage_1.cloneIncomingMessage)(response);
                const secondClone = (0, cloneIncomingMessage_1.cloneIncomingMessage)(response);
                function emitResponse(event, requestId, message, emitter) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const isomorphicResponse = yield IsomorphicResponse_1.IsomorphicResponse.fromIncomingMessage(message);
                        emitter.emit(event, isomorphicResponse, requestId);
                    });
                }
                emitResponse('response', this.requestId, secondClone, this.emitter);
                return super.emit(event, firstClone, ...args.slice(1));
            }
            catch (e) {
                return super.emit(event, ...args);
            }
        }
        return super.emit(event, ...args);
    }
    toIsomorphicRequest(body) {
        const outgoingHeaders = this.getHeaders();
        const headers = new headers_polyfill_1.Headers();
        for (const [headerName, headerValue] of Object.entries(outgoingHeaders)) {
            if (!headerValue) {
                continue;
            }
            headers.set(headerName.toLowerCase(), headerValue.toString());
        }
        const url = this.originalUrl || this.url;
        console.log('HERE');
        console.log(url);
        const isomorphicRequest = new IsomorphicRequest_1.IsomorphicRequest(url, {
            body,
            method: this.method || 'GET',
            credentials: 'same-origin',
            headers
        });
        return isomorphicRequest;
    }
}
exports.NodeClientRequest = NodeClientRequest;
const modifyRequestOptionsWithProxyConfig = (requestOptions, url, proxyConfig) => {
    var _a, _b, _c, _d;
    const modifiedRequestOptions = Object.assign({}, requestOptions);
    if (!modifiedRequestOptions.headers) {
        modifiedRequestOptions.headers = {};
    }
    modifiedRequestOptions.headers[proxyUtils_1.SupergoodProxyHeaders.upstreamHeader] =
        url.protocol + '//' + url.host;
    modifiedRequestOptions.headers[proxyUtils_1.SupergoodProxyHeaders.clientId] =
        proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.clientId;
    modifiedRequestOptions.headers[proxyUtils_1.SupergoodProxyHeaders.clientSecret] =
        proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.clientSecret;
    modifiedRequestOptions.protocol = (_a = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL) === null || _a === void 0 ? void 0 : _a.protocol;
    modifiedRequestOptions.host = (_b = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL) === null || _b === void 0 ? void 0 : _b.host;
    modifiedRequestOptions.hostname = (_c = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL) === null || _c === void 0 ? void 0 : _c.hostname;
    modifiedRequestOptions.port = (_d = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.proxyURL) === null || _d === void 0 ? void 0 : _d.port;
    return modifiedRequestOptions;
};
//# sourceMappingURL=NodeClientRequest.js.map