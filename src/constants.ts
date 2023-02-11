const signals = [
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
  'SIGBREAK',
  'SIGWINCH'
] as const;

const defaultConfig = {
  flushInterval: process.env.SUPERGOOD_FLUSH_INTERVAL || 1000,
  cacheTtl: process.env.SUPERGOOD_CACHE_TTL || 0,
  eventSinkEndpoint: '/api/events',
  errorSinkEndpoint: '/api/errors',
  keysToHash: ['request.body', 'response.body']
};

const errors = {
  CACHING_RESPONSE: 'Error Caching Response',
  CACHING_REQUEST: 'Error Caching Request',
  DUMPING_DATA_TO_DISK: 'Error Dumping Data to Disk',
  POSTING_EVENTS: 'Error Posting Events',
  POSTING_ERRORS: 'Error Posting Errors',
  FETCHING_CONFIG: 'Error Fetching Config',
  WRITING_TO_DISK: 'Error writing to disk',
  TEST_ERROR: 'Test Error for Testing Purposes',
  UNAUTHORIZED: 'Unauthorized: Invalid Client ID or Secret. Exiting.'
};

const TestErrorPath = '/api/supergood-test-error';

export { signals, defaultConfig, errors, TestErrorPath };
