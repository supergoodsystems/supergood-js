import { Interceptor, NodeRequestInterceptorOptions } from './Interceptor';
export declare class FetchInterceptor extends Interceptor {
    constructor(options?: NodeRequestInterceptorOptions);
    static checkEnvironment(): boolean;
    setup({ isWithinContext }: {
        isWithinContext: () => boolean;
    }): void;
}
