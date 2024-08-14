"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = void 0;
const NodeClientRequest_1 = require("./NodeClientRequest");
const request_args_1 = require("./utils/request-args");
function get(protocol, options) {
    return function interceptorsHttpGet(...args) {
        const clientRequestArgs = (0, request_args_1.normalizeClientRequestArgs)(`${protocol}:`, ...args);
        const request = new NodeClientRequest_1.NodeClientRequest(clientRequestArgs, options);
        request.end();
        return request;
    };
}
exports.get = get;
//# sourceMappingURL=http.get.js.map