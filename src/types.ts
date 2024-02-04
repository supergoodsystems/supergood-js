interface HeaderOptionType {
  headers: {
    'Content-Type': string;
    Authorization: string;
    'Supergood-api': string;
  };
}

type JSONValue = string | number | boolean | null | JSONArray | JSONObject;

interface JSONArray extends Array<JSONValue> {}
interface JSONObject {
  [key: string]: JSONValue;
}

type BodyType = JSONObject

interface RequestType {
  id: string;
  headers: Record<string, string>;
  method: string;
  url: string;
  path: string;
  search: string;
  body?: string | BodyType | [BodyType];
  requestedAt: Date;
}

interface ResponseType {
  headers: Record<string, string>;
  status: number;
  statusText: string;
  body?: string | BodyType | [BodyType];
  respondedAt: Date;
  duration?: number;
}

interface ConfigType {
  baseUrl: string;
  flushInterval: number;
  logLevel: string;
  remoteConfigFetchInterval: number;
  ignoredDomains: string[];
  allowLocalUrls: boolean;
  cacheTtl: number;
  keysToHash: string[];
  remoteConfigFetchEndpoint: string; // Defaults to {baseUrl}/config if not provided
  eventSinkEndpoint: string; // Defaults to {baseUrl}/events if not provided
  errorSinkEndpoint: string; // Defaults to {baseUrl}/errors if not provided
  telemetryEndpoint: string; // Defaults to {baseUrl}/telemetry if not provided
  waitAfterClose: number;
  remoteConfig: RemoteConfigType;
  logRequestHeaders: boolean;
  logRequestBody: boolean;
  logResponseHeaders: boolean;
  logResponseBody: boolean;
}

interface TelemetryType {
  cacheKeys: number;
  cacheSize: number;
  serviceName?: string;
}

interface EndpointConfigType {
  location: string;
  regex: string;
  ignored: boolean;
  sensitiveKeys: Array<string>;
}

interface RemoteConfigType {
  [domain: string]: {
    [endpointName: string]: EndpointConfigType;
  };
};

interface MetadataType {
  keys?: number;
  size?: number;
  requestUrl?: string;
  serviceName?: string;
}

interface EventRequestType {
  request: RequestType;
  response: ResponseType;
  metadata?: {
    sensitiveKeys: Array<SensitiveKeyMetadata>;
  };
}

// interface EventResponseType {}

type ErrorPayloadType = {
  payload: InfoPayloadType;
  error: string;
  message: string;
};

// interface ErrorResponseType {}

interface InfoPayloadType {
  config: ConfigType;
  request?: Request;
  response?: Omit<
    Response,
    'buffer' | 'size' | 'textConverted' | 'timeout' | 'headers'
  >;
  data?: EventRequestType[];
  packageName?: string;
  packageVersion?: string;
  metadata?: MetadataType;
}

interface LoggerType {
  error: (
    message: string,
    payload: InfoPayloadType,
    error: Error,
    extra?: any
  ) => void;
  info: (message: string, payload?: InfoPayloadType) => void;
  debug: (message: string, payload?: any) => void;
}

type RemoteConfigPayloadType = Array<{
  domain: string;
  endpoints: Array<{
    name: string;
    matchingRegex: {
      regex: string;
      location: string;
    };
    endpointConfiguration: {
      action: string;
      sensitiveKeys: Array<
        {
          keyPath: string;
        }>;
    }
  }>;
}>;

type SensitiveKeyMetadata = {
  keyPath?: string;
  length?: number;
  type?: string;
};

export type {
  HeaderOptionType,
  RequestType,
  ResponseType,
  EventRequestType,
  InfoPayloadType,
  LoggerType,
  ConfigType,
  ErrorPayloadType,
  BodyType,
  SensitiveKeyMetadata,
  RemoteConfigType,
  EndpointConfigType,
  RemoteConfigPayloadType,
  MetadataType,
  TelemetryType
};
