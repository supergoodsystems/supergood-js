import { ClientRequest, IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import { NormalizedClientRequestArgs } from './utils/request-args';
import { Readable } from 'stream';
import crypto from 'crypto';
import { Headers } from 'headers-polyfill';
import {
  ClientRequestWriteArgs,
  normalizeClientRequestWriteArgs
} from './utils/normalizeClientRequestWriteArgs';
import { IsomorphicRequest } from './utils/IsomorphicRequest';
import { getArrayBuffer } from './utils/bufferUtils';
import { isInterceptable } from './utils/isInterceptable';
import { IsomorphicResponse } from './utils/IsomorphicResponse';
import { cloneIncomingMessage } from './utils/cloneIncomingMessage';
import { shouldProxyRequest, SupergoodProxyHeaders } from './utils/proxyUtils';
import { ProxyConfigType } from '../types';
import { ResolvedRequestOptions } from './utils/getUrlByRequestOptions';

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

export class NodeClientRequest extends ClientRequest {
  private emitter: EventEmitter;

  public url: URL;
  public requestBuffer: Buffer | null;
  public requestId: string | null = null;
  public isInterceptable: boolean;
  private originalUrl?: URL;

  constructor(
    [url, requestOptions, callback]: NormalizedClientRequestArgs,
    options: NodeClientOptions
  ) {
    const tmpURL = new URL(url);
    if (shouldProxyRequest(url, options.proxyConfig)) {
      requestOptions = modifyRequestOptionsWithProxyConfig(
        requestOptions,
        url,
        options?.proxyConfig
      );
    }

    super(requestOptions, callback);

    this.requestId = crypto.randomUUID();
    this.url = url;
    this.emitter = options.emitter;

    // Set request buffer to null by default so that GET/HEAD requests
    // without a body wouldn't suddenly get one.
    this.requestBuffer = null;

    this.isInterceptable = isInterceptable({
      url: this.url,
      ignoredDomains: options.ignoredDomains ?? [],
      allowedDomains: options.allowedDomains ?? [],
      baseUrl: options.baseUrl ?? '',
      allowLocalUrls: options.allowLocalUrls ?? false,
      allowIpAddresses: options.allowIpAddresses ?? false,
      isWithinContext: options.isWithinContext ?? (() => true)
    });

    if (shouldProxyRequest(this.url, options?.proxyConfig)) {
      this.modifyRequestWithProxyConfig(tmpURL, options?.proxyConfig);
    }
  }

  private modifyRequestWithProxyConfig(
    tmpUrl: URL,
    proxyConfig?: ProxyConfigType
  ): void {
    this.originalUrl = tmpUrl;
    this.setHeader(
      SupergoodProxyHeaders.upstreamHeader,
      this.url.protocol + '//' + this.url.host
    );
    this.setHeader(SupergoodProxyHeaders.clientId, proxyConfig?.clientId || '');
    this.setHeader(
      SupergoodProxyHeaders.clientSecret,
      proxyConfig?.clientSecret || ''
    );
    this.setHeader('host', proxyConfig?.proxyURL?.host || '');
    if (proxyConfig?.proxyURL) {
      this.url.protocol = proxyConfig?.proxyURL.protocol;
      this.url.hostname = proxyConfig?.proxyURL.hostname;
      this.url.host = proxyConfig?.proxyURL.host;
      this.url.protocol = proxyConfig.proxyURL.protocol;
      this.url.port = proxyConfig.proxyURL.port;
    }
  }

  private writeRequestBodyChunk(
    chunk: string | Buffer | null,
    encoding?: BufferEncoding
  ): void {
    if (chunk == null) {
      return;
    }

    if (this.requestBuffer == null) {
      this.requestBuffer = Buffer.from([]);
    }

    const resolvedChunk = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk, encoding);

    this.requestBuffer = Buffer.concat([this.requestBuffer, resolvedChunk]);
  }

  write(...args: ClientRequestWriteArgs): boolean {
    const [chunk, encoding, callback] = normalizeClientRequestWriteArgs(args);

    // Write each request body chunk to the internal buffer.
    this.writeRequestBodyChunk(chunk, encoding);

    return super.write(chunk, encoding as BufferEncoding, callback);
  }

  end(cb?: (() => void) | undefined): this;
  end(chunk: any, cb?: (() => void) | undefined): this;
  end(
    chunk: any,
    encoding: BufferEncoding,
    cb?: (() => void) | undefined
  ): this;
  end(chunk?: unknown, encoding?: unknown, cb?: unknown): this {
    if (this.isInterceptable) {
      const requestBody = getArrayBuffer(this.requestBuffer ?? Buffer.from([]));
      this.emitter.emit(
        'request',
        this.toIsomorphicRequest(requestBody),
        this.requestId
      );
    }
    return super.end(chunk, encoding as BufferEncoding, cb as () => void);
  }

  emit(event: 'close'): boolean;
  emit(event: 'drain'): boolean;
  emit(event: 'error', err: Error): boolean;
  emit(event: 'finish'): boolean;
  emit(event: 'pipe', src: Readable): boolean;
  emit(event: 'unpipe', src: Readable): boolean;
  emit(event: string | symbol, ...args: any[]) {
    if (event === 'response' && this.isInterceptable) {
      try {
        const response = args[0] as IncomingMessage;
        const firstClone = cloneIncomingMessage(response);
        const secondClone = cloneIncomingMessage(response);
        async function emitResponse(
          event: string,
          requestId: string,
          message: IncomingMessage,
          emitter: EventEmitter
        ) {
          const isomorphicResponse =
            await IsomorphicResponse.fromIncomingMessage(message);
          emitter.emit(event, isomorphicResponse, requestId);
        }

        emitResponse(
          'response',
          this.requestId as string,
          secondClone,
          this.emitter
        );
        return super.emit(event, firstClone, ...args.slice(1));
      } catch (e) {
        return super.emit(event as string, ...args);
      }
    }
    return super.emit(event as string, ...args);
  }

  private toIsomorphicRequest(body: ArrayBuffer): IsomorphicRequest {
    const outgoingHeaders = this.getHeaders();

    const headers = new Headers();
    for (const [headerName, headerValue] of Object.entries(outgoingHeaders)) {
      if (!headerValue) {
        continue;
      }

      headers.set(headerName.toLowerCase(), headerValue.toString());
    }

    const url = this.originalUrl || this.url;
    const isomorphicRequest = new IsomorphicRequest(url, {
      body,
      method: this.method || 'GET',
      credentials: 'same-origin',
      headers
    });

    return isomorphicRequest;
  }
}

// NOTE: this function lives outside of the class since it
// must be run prior to calling super()
const modifyRequestOptionsWithProxyConfig = (
  requestOptions: ResolvedRequestOptions,
  url: URL,
  proxyConfig?: ProxyConfigType
): ResolvedRequestOptions => {
  const modifiedRequestOptions = { ...requestOptions };
  if (!modifiedRequestOptions.headers) {
    modifiedRequestOptions.headers = {};
  }

  modifiedRequestOptions.headers[SupergoodProxyHeaders.upstreamHeader] =
    url.protocol + '//' + url.host;
  modifiedRequestOptions.headers[SupergoodProxyHeaders.clientId] =
    proxyConfig?.clientId;
  modifiedRequestOptions.headers[SupergoodProxyHeaders.clientSecret] =
    proxyConfig?.clientSecret;

  modifiedRequestOptions.protocol = proxyConfig?.proxyURL?.protocol;
  modifiedRequestOptions.host = proxyConfig?.proxyURL?.host;
  modifiedRequestOptions.hostname = proxyConfig?.proxyURL?.hostname;
  modifiedRequestOptions.port = proxyConfig?.proxyURL?.port;
  return modifiedRequestOptions;
};
