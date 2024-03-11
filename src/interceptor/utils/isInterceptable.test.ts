import { isInterceptable } from './isInterceptable';

describe('isInterceptable', () => {
  it('should return false if the request is same-origin', () => {
    const url = new URL('https://api.supergood.ai');
    const ignoredDomains: string[] = [];
    const allowedDomains: string[] = [];
    const baseUrl = 'https://api.supergood.ai';
    const allowLocalUrls = false;
    const allowIpAddresses = false;

    const result = isInterceptable({
      url,
      ignoredDomains,
      allowedDomains,
      baseUrl,
      allowLocalUrls,
      allowIpAddresses,
    });

    expect(result).toBe(false);
  });

  it('should return false if the request without TLD', () => {
    const url = new URL('http://localhost');
    const ignoredDomains: string[] = [];
    const allowedDomains: string[] = [];
    const baseUrl = 'https://api.supergood.ai';
    const allowLocalUrls = false;
    const allowIpAddresses = false;


    const result = isInterceptable({
      url,
      ignoredDomains,
      allowedDomains,
      baseUrl,
      allowLocalUrls,
      allowIpAddresses,
    });

    expect(result).toBe(false);
  });

  it('should return true if the request without TLD but allowLocalUrls is true', () => {
    const url = new URL('http://localhost');
    const ignoredDomains: string[] = [];
    const allowedDomains: string[] = [];
    const baseUrl = 'https://api.supergood.ai';
    const allowLocalUrls = true;
    const allowIpAddresses = false;

    const result = isInterceptable({
      url,
      ignoredDomains,
      allowedDomains,
      baseUrl,
      allowLocalUrls,
      allowIpAddresses
    });

    expect(result).toBe(true);
  });

  it('should return false if the request with common TLD', () => {
    const url = new URL('http://somedomain.local');
    const ignoredDomains: string[] = [];
    const allowedDomains: string[] = [];
    const baseUrl = 'https://api.supergood.ai';
    const allowLocalUrls = false;
    const allowIpAddresses = false;

    const result = isInterceptable({
      url,
      ignoredDomains,
      allowedDomains,
      baseUrl,
      allowLocalUrls,
      allowIpAddresses
    });

    expect(result).toBe(false);
  });

  it('should return true if the request with common TLD but allowLocalUrls is true', () => {
    const url = new URL('http://somedomain.local');
    const ignoredDomains: string[] = [];
    const allowedDomains: string[] = [];
    const baseUrl = 'https://api.supergood.ai';
    const allowLocalUrls = true;
    const allowIpAddresses = false;

    const result = isInterceptable({
      url,
      ignoredDomains,
      allowedDomains,
      baseUrl,
      allowLocalUrls,
      allowIpAddresses
    });

    expect(result).toBe(true);
  });

  it('should return false if the request with ignored domain', () => {
    const url = new URL('http://somedomain.com');
    const ignoredDomains: string[] = ['somedomain.com'];
    const allowedDomains: string[] = [];
    const baseUrl = 'https://api.supergood.ai';
    const allowLocalUrls = false;
    const allowIpAddresses = false;

    const result = isInterceptable({
      url,
      ignoredDomains,
      allowedDomains,
      baseUrl,
      allowLocalUrls,
      allowIpAddresses
    });

    expect(result).toBe(false);
  });

  it('should return false if allowedDomains is populated and the domain is not in the list', () => {
    const url = new URL('http://somedomain.com');
    const ignoredDomains: string[] = ['somedomain.com'];
    const allowedDomains: string[] = [];
    const baseUrl = 'https://api.supergood.ai';
    const allowLocalUrls = false;
    const allowIpAddresses = false;

    const result = isInterceptable({
      url,
      ignoredDomains,
      allowedDomains,
      baseUrl,
      allowLocalUrls,
      allowIpAddresses
    });

    expect(result).toBe(false);
  });

  it('should return false if allowedDomains is populated and the domain is not in the list', () => {
    const url = new URL('http://somedomain.com');
    const ignoredDomains: string[] = ['somedomain.com'];
    const allowedDomains: string[] = [];
    const baseUrl = 'https://api.supergood.ai';
    const allowLocalUrls = false;
    const allowIpAddresses = false;

    const result = isInterceptable({
      url,
      ignoredDomains,
      allowedDomains,
      baseUrl,
      allowLocalUrls,
      allowIpAddresses
    });

    expect(result).toBe(false);
  });

});
