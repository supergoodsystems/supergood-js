/// <reference types="node" />
/// <reference types="node" />
import http from 'http';
import https from 'https';
import { Protocol } from './NodeClientRequest';
import { Interceptor, NodeRequestInterceptorOptions } from './Interceptor';
export type ClientRequestModules = Map<Protocol, typeof http | typeof https>;
export declare class NodeRequestInterceptor extends Interceptor {
    private modules;
    constructor(options?: NodeRequestInterceptorOptions);
    setup({ isWithinContext }: {
        isWithinContext: () => boolean;
    }): void;
}
