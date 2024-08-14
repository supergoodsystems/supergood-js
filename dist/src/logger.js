"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pinoLogger = void 0;
const pino_1 = __importDefault(require("pino"));
exports.pinoLogger = (0, pino_1.default)({ level: 'info', enabled: false });
//# sourceMappingURL=logger.js.map