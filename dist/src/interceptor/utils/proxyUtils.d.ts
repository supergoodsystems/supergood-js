import { ProxyConfigType } from '../../types';
export declare const SupergoodProxyHeaders: {
    upstreamHeader: string;
    clientId: string;
    clientSecret: string;
};
export declare const shouldProxyRequest: (url: URL, proxyConfig?: ProxyConfigType) => boolean | undefined;
