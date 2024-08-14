export declare function isInterceptable({ url, ignoredDomains, allowedDomains, baseUrl, allowLocalUrls, allowIpAddresses, isWithinContext: isWithinContext, }: {
    url: URL;
    ignoredDomains: string[];
    allowedDomains: string[];
    baseUrl: string;
    allowLocalUrls: boolean;
    allowIpAddresses: boolean;
    isWithinContext: () => boolean;
}): boolean;
