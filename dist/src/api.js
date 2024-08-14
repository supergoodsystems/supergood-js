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
exports.postTelemetry = exports.fetchRemoteConfig = exports.postEvents = exports.postError = void 0;
const utils_1 = require("./utils");
const postError = (errorSinkUrl, errorPayload, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield (0, utils_1.post)(errorSinkUrl, errorPayload, options.headers.Authorization, options.timeout);
        return response;
    }
    catch (e) {
        console.warn(`Failed to report error to ${errorSinkUrl}`);
        console.warn(JSON.stringify(e, ['stack', 'message']));
        return null;
    }
});
exports.postError = postError;
const postEvents = (eventSinkUrl, data, options) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield (0, utils_1.post)(eventSinkUrl, data, options.headers.Authorization, options.timeout);
    return response;
});
exports.postEvents = postEvents;
const postTelemetry = (telemetryUrl, data, options) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield (0, utils_1.post)(telemetryUrl, data, options.headers.Authorization, options.timeout);
    return response;
});
exports.postTelemetry = postTelemetry;
const fetchRemoteConfig = (configUrl, options) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield (0, utils_1.get)(configUrl, options.headers.Authorization, options.timeout);
    return JSON.parse(response);
});
exports.fetchRemoteConfig = fetchRemoteConfig;
//# sourceMappingURL=api.js.map