"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneObject = void 0;
function isPlainObject(obj) {
    var _a;
    if (obj == null || !((_a = obj.constructor) === null || _a === void 0 ? void 0 : _a.name)) {
        return false;
    }
    return obj.constructor.name === 'Object';
}
function cloneObject(obj) {
    const enumerableProperties = Object.entries(obj).reduce((acc, [key, value]) => {
        acc[key] = isPlainObject(value) ? cloneObject(value) : value;
        return acc;
    }, {});
    return isPlainObject(obj)
        ? enumerableProperties
        : Object.assign(Object.getPrototypeOf(obj), enumerableProperties);
}
exports.cloneObject = cloneObject;
//# sourceMappingURL=cloneObject.js.map