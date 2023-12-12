export const SUPERGOOD_CLIENT_ID = 'test-client-id';
export const SUPERGOOD_CLIENT_SECRET = 'test-client-secret';

export const MOCK_DATA_SERVER_PORT = 3001;
export const MOCK_DATA_SERVER = `http://localhost:${MOCK_DATA_SERVER_PORT}`;

export const SUPERGOOD_SERVER_PORT = 9001;
export const SUPERGOOD_SERVER = `http://localhost:${SUPERGOOD_SERVER_PORT}`;

export const SUPERGOOD_CONFIG = {
  flushInterval: 30000,
  cacheTtl: 0,
  eventSinkEndpoint: `/events`,
  errorSinkEndpoint: `/errors`,
  keysToHash: ['request.body', 'response.body'],
  ignoredDomains: []
};

export const BASE64_REGEX =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
