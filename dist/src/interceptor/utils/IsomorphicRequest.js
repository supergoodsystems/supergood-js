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
exports.IsomorphicRequest = void 0;
const crypto_1 = __importDefault(require("crypto"));
const headers_polyfill_1 = require("headers-polyfill");
const ts_essentials_1 = require("ts-essentials");
const bufferUtils_1 = require("./bufferUtils");
class IsomorphicRequest {
    constructor(input, init = {}) {
        const defaultBody = new ArrayBuffer(0);
        this._bodyUsed = false;
        if (input instanceof IsomorphicRequest) {
            this.id = input.id;
            this.url = input.url;
            this.method = input.method;
            this.headers = input.headers;
            this.credentials = input.credentials;
            this._body = input._body || defaultBody;
            return;
        }
        this.id = crypto_1.default.randomUUID();
        this.url = input;
        this.method = init.method || 'GET';
        this.headers = new headers_polyfill_1.Headers(init.headers);
        this.credentials = init.credentials || 'same-origin';
        this._body = init.body || defaultBody;
    }
    get bodyUsed() {
        return this._bodyUsed;
    }
    text() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, ts_essentials_1.assert)(!this.bodyUsed, 'Failed to execute "text" on "IsomorphicRequest": body buffer already read');
            this._bodyUsed = true;
            return (0, bufferUtils_1.decodeBuffer)(this._body);
        });
    }
    json() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, ts_essentials_1.assert)(!this.bodyUsed, 'Failed to execute "json" on "IsomorphicRequest": body buffer already read');
            this._bodyUsed = true;
            const text = (0, bufferUtils_1.decodeBuffer)(this._body);
            return JSON.parse(text);
        });
    }
    arrayBuffer() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, ts_essentials_1.assert)(!this.bodyUsed, 'Failed to execute "arrayBuffer" on "IsomorphicRequest": body buffer already read');
            this._bodyUsed = true;
            return this._body;
        });
    }
    clone() {
        return new IsomorphicRequest(this);
    }
    static fromFetchRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const requestClone = request.clone();
            const url = new URL(requestClone.url);
            const body = yield requestClone.arrayBuffer();
            return new IsomorphicRequest(url, {
                body,
                method: requestClone.method || 'GET',
                credentials: 'same-origin',
                headers: requestClone.headers
            });
        });
    }
}
exports.IsomorphicRequest = IsomorphicRequest;
//# sourceMappingURL=IsomorphicRequest.js.map