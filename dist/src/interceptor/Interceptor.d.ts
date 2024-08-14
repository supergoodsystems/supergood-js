/// <reference types="node" />
import { EventEmitter } from 'events';
import { ProxyConfigType } from '../types';
export interface NodeRequestInterceptorOptions {
    ignoredDomains?: string[];
    allowedDomains?: string[];
    allowLocalUrls?: boolean;
    allowIpAddresses?: boolean;
    baseUrl?: string;
    proxyConfig?: ProxyConfigType;
}
export declare class Interceptor {
    protected emitter: EventEmitter;
    protected options: NodeRequestInterceptorOptions;
    protected subscriptions: Array<() => void>;
    constructor(options?: NodeRequestInterceptorOptions);
    setup({ isWithinContext }: {
        isWithinContext: () => boolean;
    }): void;
    teardown(): void;
    on(event: string, listener: (...args: any[]) => void): void;
    static checkEnvironment(): boolean;
}
