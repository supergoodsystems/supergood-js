import crypto from 'crypto';

import { IsomorphicRequest } from './utils/IsomorphicRequest';
import { IsomorphicResponse } from './utils/IsomorphicResponse';
import { isInterceptable } from './utils/isInterceptable';
import { Interceptor, NodeRequestInterceptorOptions } from './Interceptor';

export class FetchInterceptor extends Interceptor {
  constructor(options?: NodeRequestInterceptorOptions) {
    super(options);
  }

  public static checkEnvironment() {
    return (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.fetch !== 'undefined'
    );
  }

  public setup({ isWithinContext }: { isWithinContext: () => boolean }){
    const pureFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      const requestId = crypto.randomUUID();
      const request = new Request(input, init);
      const _isInterceptable = isInterceptable({
        url: new URL(request.url),
        ignoredDomains: this.options.ignoredDomains ?? [],
        allowedDomains: this.options.allowedDomains ?? [],
        baseUrl: this.options.baseUrl ?? '',
        allowLocalUrls: this.options.allowLocalUrls ?? false,
        allowIpAddresses: this.options.allowIpAddresses ?? false,
        isWithinContext: isWithinContext ?? (() => true),
      });

      if (_isInterceptable) {
        const isomorphicRequest = await IsomorphicRequest.fromFetchRequest(
          request
        );
        this.emitter.emit('request', isomorphicRequest, requestId);
      }

      return pureFetch(request).then(async (response) => {
        if (_isInterceptable) {
          const isomorphicResponse = await IsomorphicResponse.fromFetchResponse(
            response
          );
          this.emitter.emit('response', isomorphicResponse, requestId);
        }
        return response;
      });
    };

    this.subscriptions.push(() => {
      globalThis.fetch = pureFetch;
    });
  }
}
