const commonLocalUrlTlds = ['local'];

const containsAnyPartial = (array: string[], targetString: string) => {
  return array.some(partial => targetString.includes(partial));
};

export function isInterceptable({
  url,
  ignoredDomains,
  allowedDomains,
  baseUrl,
  baseTelemetryUrl,
  allowLocalUrls,
  allowIpAddresses,
  isWithinContext: isWithinContext = () => true,
}: {
  url: URL;
  ignoredDomains: string[];
  allowedDomains: string[];
  baseUrl: string;
  baseTelemetryUrl: string;
  allowLocalUrls: boolean;
  allowIpAddresses: boolean;
  isWithinContext: () => boolean;
}): boolean {

  if (!isWithinContext()) {
    return false;
  }

  const { origin: baseOrigin } = new URL(baseUrl);
  const hostname = url.hostname;
  const [, tld] = hostname.split('.');

  if (baseOrigin === url.origin || containsAnyPartial(['supergood.ai', baseTelemetryUrl, baseUrl], hostname)) {
    return false;
  }

  if(allowedDomains && allowedDomains.length > 0) {
    if (containsAnyPartial(allowedDomains, hostname)) {
      return true;
    } else {
      return false;
    }
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
  if (containsAnyPartial(ignoredDomains, hostname)) {
    return false;
  }

  return true;
}
