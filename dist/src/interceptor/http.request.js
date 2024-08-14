"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = void 0;
const NodeClientRequest_1 = require("./NodeClientRequest");
const request_args_1 = require("./utils/request-args");
function request(protocol, options) {
    return function interceptorsHttpRequest(...args) {
        const clientRequestArgs = (0, request_args_1.normalizeClientRequestArgs)(`${protocol}:`, ...args);
        return new NodeClientRequest_1.NodeClientRequest(clientRequestArgs, options);
    };
}
exports.request = request;
//# sourceMappingURL=http.request.js.map