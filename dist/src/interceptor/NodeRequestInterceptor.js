"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeRequestInterceptor = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const http_request_1 = require("./http.request");
const http_get_1 = require("./http.get");
const Interceptor_1 = require("./Interceptor");
class NodeRequestInterceptor extends Interceptor_1.Interceptor {
    constructor(options) {
        super(options);
        this.modules = new Map();
        this.modules.set('http', http_1.default);
        this.modules.set('https', https_1.default);
    }
    setup({ isWithinContext }) {
        for (const [protocol, requestModule] of this.modules) {
            const { request: pureRequest, get: pureGet } = requestModule;
            this.subscriptions.push(() => {
                requestModule.request = pureRequest;
                requestModule.get = pureGet;
            });
            const options = {
                emitter: this.emitter,
                ignoredDomains: this.options.ignoredDomains,
                allowedDomains: this.options.allowedDomains,
                allowLocalUrls: this.options.allowLocalUrls,
                allowIpAddresses: this.options.allowIpAddresses,
                baseUrl: this.options.baseUrl,
                proxyConfig: this.options.proxyConfig,
                isWithinContext
            };
            requestModule.request = (0, http_request_1.request)(protocol, options);
            requestModule.get = (0, http_get_1.get)(protocol, options);
        }
    }
}
exports.NodeRequestInterceptor = NodeRequestInterceptor;
//# sourceMappingURL=NodeRequestInterceptor.js.map