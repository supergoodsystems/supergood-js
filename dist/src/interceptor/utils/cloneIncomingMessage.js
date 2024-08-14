"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneIncomingMessage = exports.IS_CLONE = void 0;
const http_1 = require("http");
const stream_1 = require("stream");
exports.IS_CLONE = Symbol('isClone');
function cloneIncomingMessage(message) {
    const clone = message.pipe(new stream_1.PassThrough());
    inheritProperties(message, clone);
    const clonedPrototype = Object.create(http_1.IncomingMessage.prototype);
    getPrototypes(clone).forEach((prototype) => {
        inheritProperties(prototype, clonedPrototype);
    });
    Object.setPrototypeOf(clone, clonedPrototype);
    Object.defineProperty(clone, exports.IS_CLONE, {
        enumerable: true,
        value: true
    });
    return clone;
}
exports.cloneIncomingMessage = cloneIncomingMessage;
function getPrototypes(source) {
    const prototypes = [];
    let current = source;
    while ((current = Object.getPrototypeOf(current))) {
        prototypes.push(current);
    }
    return prototypes;
}
function inheritProperties(source, target) {
    const properties = [
        ...Object.getOwnPropertyNames(source),
        ...Object.getOwnPropertySymbols(source)
    ];
    for (const property of properties) {
        if (target.hasOwnProperty(property)) {
            continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(source, property);
        if (!descriptor) {
            continue;
        }
        Object.defineProperty(target, property, descriptor);
    }
}
//# sourceMappingURL=cloneIncomingMessage.js.map