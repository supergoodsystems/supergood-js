/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { ClientRequest } from 'http';
import { EventEmitter } from 'events';
import { NormalizedClientRequestArgs } from './utils/request-args';
import { Readable } from 'stream';
import { ClientRequestWriteArgs } from './utils/normalizeClientRequestWriteArgs';
import { ProxyConfigType } from '../types';
export type NodeClientOptions = {
    emitter: EventEmitter;
    allowLocalUrls?: boolean;
    baseUrl?: string;
    ignoredDomains?: string[];
    allowedDomains?: string[];
    allowIpAddresses?: boolean;
    proxyConfig?: ProxyConfigType;
    isWithinContext?: () => boolean;
};
export type Protocol = 'http' | 'https';
export declare class NodeClientRequest extends ClientRequest {
    private emitter;
    url: URL;
    requestBuffer: Buffer | null;
    requestId: string | null;
    isInterceptable: boolean;
    private originalUrl?;
    constructor([url, requestOptions, callback]: NormalizedClientRequestArgs, options: NodeClientOptions);
    private modifyRequestWithProxyConfig;
    private writeRequestBodyChunk;
    write(...args: ClientRequestWriteArgs): boolean;
    end(cb?: (() => void) | undefined): this;
    end(chunk: any, cb?: (() => void) | undefined): this;
    end(chunk: any, encoding: BufferEncoding, cb?: (() => void) | undefined): this;
    emit(event: 'close'): boolean;
    emit(event: 'drain'): boolean;
    emit(event: 'error', err: Error): boolean;
    emit(event: 'finish'): boolean;
    emit(event: 'pipe', src: Readable): boolean;
    emit(event: 'unpipe', src: Readable): boolean;
    private toIsomorphicRequest;
}
