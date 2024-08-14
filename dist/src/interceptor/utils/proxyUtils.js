"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldProxyRequest = exports.SupergoodProxyHeaders = void 0;
exports.SupergoodProxyHeaders = {
    upstreamHeader: 'X-Supergood-Upstream',
    clientId: 'X-Supergood-ClientID',
    clientSecret: 'X-Supergood-ClientSecret'
};
const shouldProxyRequest = (url, proxyConfig) => {
    var _a, _b;
    return (_b = (_a = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.vendorCredentialConfig) === null || _a === void 0 ? void 0 : _a[url.hostname]) === null || _b === void 0 ? void 0 : _b.enabled;
};
exports.shouldProxyRequest = shouldProxyRequest;
//# sourceMappingURL=proxyUtils.js.map