"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeClientRequestWriteArgs = void 0;
function normalizeClientRequestWriteArgs(args) {
    const chunk = args[0];
    const encoding = typeof args[1] === 'string' ? args[1] : undefined;
    const callback = typeof args[1] === 'function' ? args[1] : args[2];
    const writeArgs = [
        chunk,
        encoding,
        callback
    ];
    return writeArgs;
}
exports.normalizeClientRequestWriteArgs = normalizeClientRequestWriteArgs;
//# sourceMappingURL=normalizeClientRequestWriteArgs.js.map