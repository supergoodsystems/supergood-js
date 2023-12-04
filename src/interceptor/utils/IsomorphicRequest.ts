import crypto from 'crypto';
import { Headers } from 'headers-polyfill';
import { assert } from 'ts-essentials';
import { decodeBuffer } from './bufferUtils';

export interface RequestInit {
  method?: string;
  headers?: Record<string, string | string[]> | Headers;
  credentials?: RequestCredentials;
  body?: ArrayBuffer;
}

export class IsomorphicRequest {
  public id: string;
  public readonly url: URL;
  public readonly method: string;
  public readonly headers: Headers;
  public readonly credentials: RequestCredentials;

  private readonly _body: ArrayBuffer;
  private _bodyUsed: boolean;

  constructor(url: URL);
  constructor(url: URL, init: RequestInit);
  constructor(request: IsomorphicRequest);
  constructor(input: IsomorphicRequest | URL, init: RequestInit = {}) {
    const defaultBody = new ArrayBuffer(0);
    this._bodyUsed = false;

    if (input instanceof IsomorphicRequest) {
      this.id = input.id;
      this.url = input.url;
      this.method = input.method;
      this.headers = input.headers;
      this.credentials = input.credentials;
      this._body = input._body || defaultBody;
      return;
    }

    this.id = crypto.randomUUID();
    this.url = input;
    this.method = init.method || 'GET';
    this.headers = new Headers(init.headers);
    this.credentials = init.credentials || 'same-origin';
    this._body = init.body || defaultBody;
  }

  public get bodyUsed(): boolean {
    return this._bodyUsed;
  }

  public async text(): Promise<string> {
    assert(
      !this.bodyUsed,
      'Failed to execute "text" on "IsomorphicRequest": body buffer already read'
    );

    this._bodyUsed = true;
    return decodeBuffer(this._body);
  }

  public async json<T = any>(): Promise<T> {
    assert(
      !this.bodyUsed,
      'Failed to execute "json" on "IsomorphicRequest": body buffer already read'
    );

    this._bodyUsed = true;
    const text = decodeBuffer(this._body);
    return JSON.parse(text);
  }

  public async arrayBuffer(): Promise<ArrayBuffer> {
    assert(
      !this.bodyUsed,
      'Failed to execute "arrayBuffer" on "IsomorphicRequest": body buffer already read'
    );

    this._bodyUsed = true;
    return this._body;
  }

  public clone(): IsomorphicRequest {
    return new IsomorphicRequest(this);
  }
}
