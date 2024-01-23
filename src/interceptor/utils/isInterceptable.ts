const commonLocalUrlTlds = ['local'];

const containsAnyPartial = (array: string[], targetString: string) => {
  return array.some(partial => targetString.includes(partial));
};

export function isInterceptable({
  url,
  ignoredDomains,
  baseUrl,
  allowLocalUrls,
  allowIpAddresses
}: {
  url: URL;
  ignoredDomains: string[];
  baseUrl: string;
  allowLocalUrls: boolean;
  allowIpAddresses: boolean;
}): boolean {
  const { origin: baseOrigin } = new URL(baseUrl);
  const hostname = url.hostname;
  const [, tld] = hostname.split('.');

  // Don't intercept internal requests
  if (baseOrigin === url.origin) {
    return false;
  }

  if (!allowIpAddresses && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return false;
  }

  if (!allowLocalUrls && !hostname) {
    return false;
  }

  // Ignore requests without a .com/.net/.org/etc
  if (!tld && !allowLocalUrls) {
    return false;
  }

  // Ignore requests with common TLD's
  if (commonLocalUrlTlds.includes(tld) && !allowLocalUrls) {
    return false;
  }

  // Ignore requests that have been explicitly excluded
  if (containsAnyPartial(ignoredDomains, url.hostname)) {
    return false;
  }

  return true;
}
