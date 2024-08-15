import { ProxyConfigType } from '../../types';

export const SupergoodProxyHeaders = {
  upstreamHeader: 'X-Supergood-Upstream',
  clientId: 'X-Supergood-ClientID',
  clientSecret: 'X-Supergood-ClientSecret'
};

export const shouldProxyRequest = (url: URL, proxyConfig?: ProxyConfigType) => {
  return proxyConfig?.vendorCredentialConfig?.[url.hostname]?.enabled;
};
