const defaultConfig = {
  flushInterval: process.env.SUPERGOOD_FLUSH_INTERVAL || 1000,
  cacheTtl: process.env.SUPERGOOD_CACHE_TTL || 0,
  eventSinkEndpoint: '/api/events',
  errorSinkEndpoint: '/api/errors',
  keysToHash: ['request.body', 'response.body'],
  ignoredDomains: []
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
  UNAUTHORIZED: 'Unauthorized: Invalid Client ID or Secret. Exiting.',
  NO_CLIENT_ID:
    'No Client ID Provided, set SUPERGOOD_CLIENT_ID or pass it as an argument',
  NO_CLIENT_SECRET:
    'No Client Secret Provided, set SUPERGOOD_CLIENT_SECRET or pass it as an argument'
};

const TestErrorPath = '/api/supergood-test-error';
const SupergoodByteLimit = 500000;

export { defaultConfig, errors, TestErrorPath, SupergoodByteLimit };
