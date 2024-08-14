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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsomorphicResponse = void 0;
const getIncomingMessageBody_1 = require("./getIncomingMessageBody");
class IsomorphicResponse {
    constructor(status, statusText, headers, body) {
        this.status = status;
        this.statusText = statusText;
        this.headers = headers;
        this.body = body;
    }
    static fromIncomingMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const responseBody = yield (0, getIncomingMessageBody_1.getIncomingMessageBody)(message);
            return new IsomorphicResponse(message.statusCode || 200, message.statusMessage || 'OK', (0, getIncomingMessageBody_1.createHeadersFromIncomingHttpHeaders)(message.headers), responseBody);
        });
    }
    static fromFetchResponse(response) {
        return __awaiter(this, void 0, void 0, function* () {
            const responseClone = response.clone();
            const body = yield responseClone.text();
            return new IsomorphicResponse(response.status || 200, response.statusText || 'OK', response.headers, body);
        });
    }
}
exports.IsomorphicResponse = IsomorphicResponse;
//# sourceMappingURL=IsomorphicResponse.js.map