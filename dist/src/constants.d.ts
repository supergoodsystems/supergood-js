declare const defaultConfig: {
    flushInterval: number;
    remoteConfigFetchInterval: number;
    timeout: number;
    eventSinkEndpoint: string;
    errorSinkEndpoint: string;
    remoteConfigFetchEndpoint: string;
    telemetryEndpoint: string;
    useRemoteConfig: boolean;
    useTelemetry: boolean;
    allowLocalUrls: boolean;
    allowIpAddresses: boolean;
    logRequestHeaders: boolean;
    logRequestBody: boolean;
    logResponseHeaders: boolean;
    logResponseBody: boolean;
    ignoredDomains: never[];
    forceRedactAll: boolean;
    redactByDefault: boolean;
    allowedDomains: never[];
    cacheTtl: number;
    proxyConfig: {};
    waitAfterClose: number;
};
declare const errors: {
    CACHING_RESPONSE: string;
    CACHING_REQUEST: string;
    DUMPING_DATA_TO_DISK: string;
    POSTING_EVENTS: string;
    POSTING_ERRORS: string;
    POSTING_TELEMETRY: string;
    FETCHING_CONFIG: string;
    WRITING_TO_DISK: string;
    TEST_ERROR: string;
    UNAUTHORIZED: string;
    NO_CLIENT_ID: string;
    NO_CLIENT_SECRET: string;
};
declare const SensitiveKeyActions: {
    REDACT: string;
    ALLOW: string;
};
declare const EndpointActions: {
    ALLOW: string;
    IGNORE: string;
};
declare const TestErrorPath = "/api/supergood-test-error";
declare const LocalClientId = "local-client-id";
declare const LocalClientSecret = "local-client-secret";
declare const ContentType: {
    Json: string;
    Text: string;
    EventStream: string;
};
declare const SupergoodProxyHeaders: {
    upstreamHeader: string;
    clientId: string;
    clientSecret: string;
};
export { defaultConfig, errors, TestErrorPath, LocalClientId, LocalClientSecret, SensitiveKeyActions, EndpointActions, ContentType, SupergoodProxyHeaders };
