"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupergoodProxyHeaders = exports.ContentType = exports.EndpointActions = exports.SensitiveKeyActions = exports.LocalClientSecret = exports.LocalClientId = exports.TestErrorPath = exports.errors = exports.defaultConfig = void 0;
const defaultConfig = {
    flushInterval: 1000,
    remoteConfigFetchInterval: 10000,
    timeout: 5000,
    eventSinkEndpoint: '/events',
    errorSinkEndpoint: '/errors',
    remoteConfigFetchEndpoint: '/v2/config',
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
    proxyConfig: {},
    waitAfterClose: 1000
};
exports.defaultConfig = defaultConfig;
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
    NO_CLIENT_ID: 'No Client ID Provided, set SUPERGOOD_CLIENT_ID or pass it as an argument',
    NO_CLIENT_SECRET: 'No Client Secret Provided, set SUPERGOOD_CLIENT_SECRET or pass it as an argument'
};
exports.errors = errors;
const SensitiveKeyActions = {
    REDACT: 'REDACT',
    ALLOW: 'ALLOW'
};
exports.SensitiveKeyActions = SensitiveKeyActions;
const EndpointActions = {
    ALLOW: 'Allow',
    IGNORE: 'Ignore'
};
exports.EndpointActions = EndpointActions;
const TestErrorPath = '/api/supergood-test-error';
exports.TestErrorPath = TestErrorPath;
const LocalClientId = 'local-client-id';
exports.LocalClientId = LocalClientId;
const LocalClientSecret = 'local-client-secret';
exports.LocalClientSecret = LocalClientSecret;
const ContentType = {
    Json: 'application/json',
    Text: 'text/plain',
    EventStream: 'text/event-stream'
};
exports.ContentType = ContentType;
const SupergoodProxyHeaders = {
    upstreamHeader: 'X-Supergood-Upstream',
    clientId: 'X-Supergood-ClientID',
    clientSecret: 'X-Supergood-ClientSecret'
};
exports.SupergoodProxyHeaders = SupergoodProxyHeaders;
//# sourceMappingURL=constants.js.map