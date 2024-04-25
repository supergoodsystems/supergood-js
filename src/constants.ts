const defaultConfig = {
  flushInterval: 1000,
  remoteConfigFetchInterval: 10000,
  timeout: 5000,
  eventSinkEndpoint: '/events',
  errorSinkEndpoint: '/errors',
  remoteConfigFetchEndpoint: '/config',
  telemetryEndpoint: '/telemetry',
  useRemoteConfig: true,
  useTelemetry: true,
  allowLocalUrls: false,
  allowIpAddresses: false,
  logRequestHeaders: true,
  logRequestBody: true,
  logResponseHeaders: true,
  logResponseBody: true,
  ignoredDomains: [],
  forceRedactAll: false,
  redactByDefault: false,
  allowedDomains: [],
  cacheTtl: 0,

  // After the close command is sent, wait for this many milliseconds before
  // exiting. This gives any hanging responses a chance to return.
  waitAfterClose: 1000,
};

const errors = {
  CACHING_RESPONSE: 'Error Caching Response',
  CACHING_REQUEST: 'Error Caching Request',
  DUMPING_DATA_TO_DISK: 'Error Dumping Data to Disk',
  POSTING_EVENTS: 'Error Posting Events',
  POSTING_ERRORS: 'Error Posting Errors',
  POSTING_TELEMETRY: 'Error Posting Telemetry',
  FETCHING_CONFIG: 'Error Fetching Config',
  WRITING_TO_DISK: 'Error writing to disk',
  TEST_ERROR: 'Test Error for Testing Purposes',
  UNAUTHORIZED: 'Unauthorized: Invalid Client ID or Secret. Exiting.',
  NO_CLIENT_ID:
    'No Client ID Provided, set SUPERGOOD_CLIENT_ID or pass it as an argument',
  NO_CLIENT_SECRET:
    'No Client Secret Provided, set SUPERGOOD_CLIENT_SECRET or pass it as an argument',
};

const SensitiveKeyActions = {
  REDACT: 'REDACT',
  ALLOW: 'ALLOW'
};

const EndpointActions = {
  ALLOW: 'Allow',
  IGNORE: 'Ignore'
}

const TestErrorPath = '/api/supergood-test-error';
const LocalClientId = 'local-client-id';
const LocalClientSecret = 'local-client-secret';

export {
  defaultConfig,
  errors,
  TestErrorPath,
  LocalClientId,
  LocalClientSecret,
  SensitiveKeyActions,
  EndpointActions
};
