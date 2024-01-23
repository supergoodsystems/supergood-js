import http from 'http';
import https from 'https';
import { request } from './http.request';
import { get } from './http.get';
import { Protocol } from './NodeClientRequest';
import { Interceptor, NodeRequestInterceptorOptions } from './Interceptor';

export type ClientRequestModules = Map<Protocol, typeof http | typeof https>;

export class NodeRequestInterceptor extends Interceptor {
  private modules: ClientRequestModules;

  constructor(options?: NodeRequestInterceptorOptions) {
    super(options);

    this.modules = new Map();
    this.modules.set('http', http);
    this.modules.set('https', https);
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
        ignoredDomains: this.options.ignoredDomains,
        allowLocalUrls: this.options.allowLocalUrls,
        allowIpAddresses: this.options.allowIpAddresses,
        baseUrl: this.options.baseUrl
      };

      // @ts-ignore
      requestModule.request = request(protocol, options);

      // @ts-ignore
      requestModule.get = get(protocol, options);
    }
  }
}
