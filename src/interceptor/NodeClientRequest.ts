import { ClientRequest, IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import { NormalizedClientRequestArgs } from './utils/request-args';
import { Readable } from 'stream';
import crypto from 'crypto';
import {
  ClientRequestWriteArgs,
  normalizeClientRequestWriteArgs
} from './utils/normalizeClientRequestWriteArgs';
import { createRequest } from './utils/createRequest';
import {
  createHeadersFromIncomingHttpHeaders,
  getIncomingMessageBody
} from './utils/getIncomingMessageBody';

export type NodeClientOptions = {
  emitter: EventEmitter;
  ignoredDomains?: string[];
};

export type Protocol = 'http' | 'https';

export class NodeClientRequest extends ClientRequest {
  private emitter: EventEmitter;

  public url: URL;
  public requestBuffer: Buffer | null;
  public requestId: string | null = null;
  public ignoredDomains: string[];

  constructor(
    [url, requestOptions, callback]: NormalizedClientRequestArgs,
    options: NodeClientOptions
  ) {
    super(requestOptions, callback);

    this.requestId = crypto.randomUUID();
    this.url = url;
    this.emitter = options.emitter;
    this.ignoredDomains = options.ignoredDomains ?? [];

    // Set request buffer to null by default so that GET/HEAD requests
    // without a body wouldn't suddenly get one.
    // used in createRequest utils function
    this.requestBuffer = null;
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
    if (!this.ignoredDomains.includes(this.url.hostname)) {
      this.emitter.emit('request', createRequest(this), this.requestId);
    }
    return super.end(chunk, encoding as BufferEncoding, cb as () => void);
  }

  emit(event: 'close'): boolean;
  emit(event: 'drain'): boolean;
  emit(event: 'error', err: Error): boolean;
  emit(event: 'finish'): boolean;
  emit(event: 'pipe', src: Readable): boolean;
  emit(event: 'unpipe', src: Readable): boolean;
  emit(event: string | symbol, ...args: any[]): boolean {
    if (event === 'response') {
      async function emitResponse(
        requestId: string,
        message: IncomingMessage,
        emitter: EventEmitter
      ) {
        const response = args[0] as IncomingMessage;
        const responseBody = await getIncomingMessageBody(message);
        emitter.emit(
          'response',
          {
            status: response.statusCode || 200,
            statusText: response.statusMessage || 'OK',
            headers: createHeadersFromIncomingHttpHeaders(message.headers),
            body: responseBody
          },
          requestId
        );
      }

      if (!this.ignoredDomains.includes(this.url.hostname)) {
        emitResponse(this.requestId as string, args[0], this.emitter);
      }
    }

    return super.emit(event as string, ...args);
  }
}
