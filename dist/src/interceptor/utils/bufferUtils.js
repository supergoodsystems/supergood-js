"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArrayBuffer = exports.decodeBuffer = exports.encodeBuffer = void 0;
const web_encoding_1 = require("web-encoding");
function encodeBuffer(text) {
    const encoder = new web_encoding_1.TextEncoder();
    const encoded = encoder.encode(text);
    return getArrayBuffer(encoded);
}
exports.encodeBuffer = encodeBuffer;
function decodeBuffer(buffer, encoding) {
    const decoder = new web_encoding_1.TextDecoder(encoding);
    return decoder.decode(buffer);
}
exports.decodeBuffer = decodeBuffer;
function getArrayBuffer(array) {
    return array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
}
exports.getArrayBuffer = getArrayBuffer;
//# sourceMappingURL=bufferUtils.js.map