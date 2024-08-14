import { Interceptor } from './Interceptor';
export declare class BatchInterceptor {
    private interceptors;
    private subscriptions;
    constructor(interceptors: Interceptor[]);
    setup({ isWithinContext }: {
        isWithinContext: () => boolean;
    }): void;
    on(event: string, listener: (...args: any[]) => void): void;
    teardown(): void;
}
