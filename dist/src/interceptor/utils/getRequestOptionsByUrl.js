"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestOptionsByUrl = void 0;
function getRequestOptionsByUrl(url) {
    const options = {
        method: 'GET',
        protocol: url.protocol,
        hostname: typeof url.hostname === 'string' && url.hostname.startsWith('[')
            ? url.hostname.slice(1, -1)
            : url.hostname,
        host: url.host,
        path: `${url.pathname}${url.search || ''}`,
    };
    if (!!url.port) {
        options.port = Number(url.port);
    }
    if (url.username || url.password) {
        options.auth = `${url.username}:${url.password}`;
    }
    return options;
}
exports.getRequestOptionsByUrl = getRequestOptionsByUrl;
//# sourceMappingURL=getRequestOptionsByUrl.js.map