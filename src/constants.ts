const signals = [
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
  'SIGBREAK',
  'SIGWINCH'
] as const;

const defaultOptions = {
  flushInterval: process.env.SUPERGOOD_FLUSH_INTERVAL || 1000,
  cacheTtl: process.env.SUPERGOOD_CACHE_TTL || 0,
  baseUrl: process.env.SUPERGOOD_BASE_URL || 'https://supergood.ai',
  eventSinkEndpoint: '/api/events',
  errorSinkEndpoint: '/api/errors',
  hashBody: process.env.SUPERGOOD_HASH_BODY || false
};

const errors = {
  CACHING_RESPONSE: 'Error Caching Response',
  CACHING_REQUEST: 'Error Caching Request',
  DUMPING_DATA_TO_DISK: 'Error Dumping Data to Disk',
  POSTING_EVENTS: 'Error Posting Events',
  POSTING_ERRORS: 'Error Posting Errors',
  GETTING_CONFIG: 'Error Getting Config',
  WRITING_TO_DISK: 'Error writing to disk',
  TEST_ERROR: 'Test Error for Testing Purposes',
  UNAUTHORIZED: 'Unauthorized: Invalid Client ID or Secret. Exiting.'
};

const TestErrorPath = '/api/supergood-test-error';

export { signals, defaultOptions, errors, TestErrorPath };
