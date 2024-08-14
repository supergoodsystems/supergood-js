import { HeaderOptionType, InfoPayloadType, RequestType, ResponseType, EventRequestType, ErrorPayloadType, RemoteConfigPayloadTypeV2, RemoteConfigType, EndpointConfigType, SensitiveKeyMetadata, TelemetryType, ConfigType, TagType } from './types';
declare const logger: ({ errorSinkUrl, headerOptions }: {
    errorSinkUrl?: string | undefined;
    headerOptions: HeaderOptionType;
}) => {
    error: (message: string, payload: InfoPayloadType, error: Error, { reportOut }?: {
        reportOut: boolean;
    }) => void;
    info: (message: string, payload?: InfoPayloadType) => void;
    debug: (message: string, payload?: any) => void;
};
declare const getHeaderOptions: (clientId: string, clientSecret: string, timeout: number) => HeaderOptionType;
declare const expandSensitiveKeySetForArrays: (obj: any, sensitiveKeys: Array<{
    keyPath: string;
    action: string;
}>) => Array<{
    keyPath: string;
    action: string;
}>;
declare const redactValuesFromKeys: (event: {
    request?: RequestType;
    response?: ResponseType;
    tags?: TagType;
    trace?: string;
}, config: ConfigType) => {
    event: {
        request?: RequestType;
        response?: ResponseType;
    };
    sensitiveKeyMetadata: Array<SensitiveKeyMetadata>;
    tags: TagType;
    trace?: string | undefined;
};
declare const parseAsSSE: (stream: string) => ({
    event: string | undefined;
    id: string | undefined;
    data: any[];
    retry: string | null | undefined;
} | undefined)[] | null;
declare const safeParseJson: (json: string) => any;
declare const parseResponseBody: (rawResponseBody: string, contentType?: string) => any;
declare const redactValue: (input: string | Record<string, string> | [Record<string, string>] | undefined) => {
    length: number | undefined;
    type: string | undefined;
};
declare const prepareData: (events: Array<EventRequestType>, supergoodConfig: ConfigType) => {
    metadata: {
        sensitiveKeys: SensitiveKeyMetadata[];
        tags: TagType;
        trace: string | undefined;
    };
    request?: RequestType | undefined;
    response?: ResponseType | undefined;
}[];
declare const post: (url: string, data: Array<EventRequestType> | ErrorPayloadType | TelemetryType, authorization: string, timeout: number) => Promise<string>;
declare const get: (url: string, authorization: string, timeout: number) => Promise<string>;
declare const processRemoteConfig: (remoteConfigPayload: RemoteConfigPayloadTypeV2) => {
    endpointConfig: RemoteConfigType;
    proxyConfig: {
        vendorCredentialConfig: {
            [key: string]: {
                enabled: boolean;
            };
        };
    };
};
declare const sleep: (ms: number) => Promise<unknown>;
declare const getEndpointConfigForRequest: (request: RequestType, remoteConfig: RemoteConfigType) => EndpointConfigType | null;
export { processRemoteConfig, getHeaderOptions, redactValue, redactValuesFromKeys, logger, safeParseJson, prepareData, sleep, post, get, getEndpointConfigForRequest, expandSensitiveKeySetForArrays, parseAsSSE, parseResponseBody };
