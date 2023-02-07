const signals = [
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
  'SIGBREAK',
  'SIGWINCH'
] as const;

// If the sink endpoints aren't provided, default to base URL
const getUrl = (endpoint: string, defaultUrl?: string) => {
  if (defaultUrl) return defaultUrl;
  const baseUrl = process.env.SUPERGOOD_BASE_URL || 'https://supergood.ai';
  return `${baseUrl}${endpoint}`;
};

const defaultOptions = {
  flushInterval: process.env.SUPERGOOD_FLUSH_INTERVAL || 1000,
  cacheTtl: process.env.SUPERGOOD_CACHE_TTL || 0,
  baseUrl: getUrl('/', process.env.SUPERGOOD_BASE_URL),
  eventSinkUrl: getUrl('/api/events', process.env.SUPERGOOD_EVENT_SINK_URL),
  errorSinkUrl: getUrl('/api/errors', process.env.SUPERGOOD_ERROR_SINK_URL),
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
