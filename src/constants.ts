const signals = [
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
  'SIGBREAK',
  'SIGWINCH'
] as const;

const defaultOptions = {
  flushInterval: 1000,
  cacheTtl: 0,
  baseUrl: 'https://supergood.ai',
  eventSinkUrl: 'https://supergood.ai/api/events',
  errorSinkUrl: 'https://supergood.ai/api/errors',
  hashBody: true
};

const errors = {
  CACHING_RESPONSE: 'Error Caching Response',
  CACHING_REQUEST: 'Error Caching Request',
  DUMPING_DATA_TO_DISK: 'Error Dumping Data to Disk',
  POSTING_EVENTS: 'Error Posting Events',
  POSTING_ERRORS: 'Error Posting Errors',
  GETTING_CONFIG: 'Error Getting Config',
  WRITING_TO_DISK: 'Error writing to disk'
};

export { signals, defaultOptions, errors };
