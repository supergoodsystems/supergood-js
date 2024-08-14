"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interceptor = void 0;
const events_1 = require("events");
class Interceptor {
    constructor(options) {
        this.subscriptions = [];
        this.emitter = new events_1.EventEmitter();
        this.options = options !== null && options !== void 0 ? options : {};
    }
    setup({ isWithinContext }) {
        throw new Error('Not implemented');
    }
    teardown() {
        for (const unsubscribe of this.subscriptions) {
            unsubscribe();
        }
        this.emitter.removeAllListeners();
    }
    on(event, listener) {
        this.emitter.on(event, listener);
    }
    static checkEnvironment() {
        return true;
    }
}
exports.Interceptor = Interceptor;
//# sourceMappingURL=Interceptor.js.map