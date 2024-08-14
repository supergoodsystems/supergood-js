"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchInterceptor = void 0;
class BatchInterceptor {
    constructor(interceptors) {
        this.subscriptions = [];
        this.interceptors = interceptors;
    }
    setup({ isWithinContext }) {
        for (const interceptor of this.interceptors) {
            interceptor.setup({ isWithinContext });
            this.subscriptions.push(() => interceptor.teardown());
        }
    }
    on(event, listener) {
        for (const interceptor of this.interceptors) {
            interceptor.on(event, listener);
        }
    }
    teardown() {
        for (const unsubscribe of this.subscriptions) {
            unsubscribe();
        }
    }
}
exports.BatchInterceptor = BatchInterceptor;
//# sourceMappingURL=BatchInterceptor.js.map