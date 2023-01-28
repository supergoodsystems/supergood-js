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
exports.getConfig = exports.dumpDataToDisk = exports.postEvents = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const DEFAULT_CONFIG = {
    keysToHash: ['request.body', 'response.body'],
    flushInterval: 1000,
    cacheTtl: 0
};
const getConfig = (baseUrl, options) => __awaiter(void 0, void 0, void 0, function* () {
    const defaultConfig = Object.assign(Object.assign({}, DEFAULT_CONFIG), { eventSinkUrl: baseUrl });
    try {
        const response = yield axios_1.default.get(`${baseUrl}/api/config`, options);
        if (response.status === 200) {
            return response.data;
        }
        else {
            return defaultConfig;
        }
    }
    catch (e) {
        return defaultConfig;
    }
});
exports.getConfig = getConfig;
const postEvents = (eventSinkUrl, data, options) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.post(eventSinkUrl, data, options);
    if (response.status === 200) {
        return response.data;
    }
    else {
        return {};
    }
});
exports.postEvents = postEvents;
const dumpDataToDisk = (data) => {
    const logFileName = `supergood_${new Date()
        .toISOString()
        .replace(/[:|.]/g, '-')}.log`;
    const dataStr = JSON.stringify(data, null, 2);
    fs_1.default.writeFileSync(logFileName, dataStr, {});
};
exports.dumpDataToDisk = dumpDataToDisk;
