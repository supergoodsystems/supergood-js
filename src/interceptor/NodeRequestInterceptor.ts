import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';
import { request } from './http.request';
import { get } from './http.get';
import { Protocol } from './NodeClientRequest';

export type ClientRequestModules = Map<Protocol, typeof http | typeof https>;

export interface NodeRequestInterceptorOptions {
  ignoredDomains?: string[];
}

export class NodeRequestInterceptor {
  private modules: ClientRequestModules;
  private subscriptions: Array<() => void> = [];
  private emitter: EventEmitter;
  private options: NodeRequestInterceptorOptions;

  constructor(options?: NodeRequestInterceptorOptions) {
    this.emitter = new EventEmitter();

    this.modules = new Map();
    this.modules.set('http', http);
    this.modules.set('https', https);

    this.options = options ?? {};
  }

  public setup() {
    for (const [protocol, requestModule] of this.modules) {
      const { request: pureRequest, get: pureGet } = requestModule;

      this.subscriptions.push(() => {
        requestModule.request = pureRequest;
        requestModule.get = pureGet;
      });

      const options = {
        emitter: this.emitter,
        ignoredDomains: this.options.ignoredDomains
      };

      // @ts-ignore
      requestModule.request = request(protocol, options);

      // @ts-ignore
      requestModule.get = get(protocol, options);
    }
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  public teardown() {
    for (const unsubscribe of this.subscriptions) {
      unsubscribe();
    }
    this.emitter.removeAllListeners();
  }
}
