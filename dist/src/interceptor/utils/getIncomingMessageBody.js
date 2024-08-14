"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHeadersFromIncomingHttpHeaders = exports.getIncomingMessageBody = void 0;
const headers_polyfill_1 = require("headers-polyfill");
const zlib = __importStar(require("zlib"));
function getIncomingMessageBody(response) {
    return new Promise((resolve, reject) => {
        const stream = response.headers['content-encoding'] === 'gzip'
            ? response.pipe(zlib.createGunzip())
            : response;
        const encoding = response.readableEncoding || 'utf8';
        stream.setEncoding(encoding);
        let body = '';
        stream.on('data', (responseBody) => {
            body += responseBody;
        });
        stream.once('end', () => {
            resolve(body);
        });
        stream.once('error', (error) => {
            reject(error);
        });
    });
}
exports.getIncomingMessageBody = getIncomingMessageBody;
function createHeadersFromIncomingHttpHeaders(httpHeaders) {
    const headers = new headers_polyfill_1.Headers();
    for (const headerName in httpHeaders) {
        const headerValues = httpHeaders[headerName];
        if (typeof headerValues === 'undefined') {
            continue;
        }
        if (Array.isArray(headerValues)) {
            headerValues.forEach((headerValue) => {
                headers.append(headerName, headerValue);
            });
            continue;
        }
        headers.set(headerName, headerValues);
    }
    return headers;
}
exports.createHeadersFromIncomingHttpHeaders = createHeadersFromIncomingHttpHeaders;
//# sourceMappingURL=getIncomingMessageBody.js.map