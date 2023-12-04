const commonLocalUrlTlds = [
  'local'
]

export function isAnIgnoredRequest ({ url, ignoredDomains, baseUrl, allowLocalUrls }: {
  url: URL, ignoredDomains: string[], baseUrl: string, allowLocalUrls: boolean
}): boolean {

  const { origin: baseOrigin } = new URL(baseUrl);
  const hostname = url.hostname;

  // Ignore intercepting responses to supergood
  if(baseOrigin === url.origin) {
    return true;
  }

  if(!hostname && !allowLocalUrls) {
    return true;
  }

  const [, tld] = hostname.split('.')

  // Ignore responses without a .com/.net/.org/etc
  if(!tld && !allowLocalUrls) {
    return true;
  }

  // Ignore responses with common TLD's
  if(commonLocalUrlTlds.includes(tld) && !allowLocalUrls) {
    return true;
  }

  // Ignore responses that have been explicitly excluded
  if(ignoredDomains.includes(url.hostname)) {
    return true
  }

  return false;
}
