import crypto from 'crypto';

import { IsomorphicRequest } from './utils/IsomorphicRequest';
import { IsomorphicResponse } from './utils/IsomorphicResponse';
import { isInterceptable } from './utils/isInterceptable';
import { SupergoodProxyHeaders } from './utils/proxyUtils';
import { Interceptor, NodeRequestInterceptorOptions } from './Interceptor';
import { ProxyConfigType } from '../types';

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

  public setup({ isWithinContext }: { isWithinContext: () => boolean }) {
    const pureFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      const requestId = crypto.randomUUID();
      let request = new Request(input, init);
      const requestURL = new URL(request.url);
      const _isInterceptable = isInterceptable({
        url: requestURL,
        ignoredDomains: this.options.ignoredDomains ?? [],
        allowedDomains: this.options.allowedDomains ?? [],
        baseUrl: this.options.baseUrl ?? '',
        allowLocalUrls: this.options.allowLocalUrls ?? false,
        allowIpAddresses: this.options.allowIpAddresses ?? false,
        isWithinContext: isWithinContext ?? (() => true)
      });

      if (_isInterceptable) {
        const isomorphicRequest = await IsomorphicRequest.fromFetchRequest(
          request
        );
        this.emitter.emit('request', isomorphicRequest, requestId);
      }

      if (
        this.options?.proxyConfig?.vendorCredentialConfig?.[requestURL.hostname]
          ?.enabled
      ) {
        request = modifyRequest(request, requestURL, this.options.proxyConfig);
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

const modifyRequest = (
  originalRequest: Request,
  originalRequestURL: URL,
  proxyConfig: ProxyConfigType
) => {
  const headers = originalRequest.headers;
  headers.set(
    SupergoodProxyHeaders.upstreamHeader,
    originalRequestURL.protocol + '//' + originalRequestURL.host
  );
  headers.set(SupergoodProxyHeaders.clientId, proxyConfig?.clientId || '');
  headers.set(
    SupergoodProxyHeaders.clientSecret,
    proxyConfig?.clientSecret || ''
  );

  const proxyURL = proxyConfig?.proxyURL as URL;
  proxyURL.pathname = originalRequestURL.pathname;
  proxyURL.search = originalRequestURL.search;

  return new Request(proxyURL as URL, { headers });
};
