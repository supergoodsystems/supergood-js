interface HeaderOptionType {
  headers: {
    'Content-Type': string;
    Authorization: string;
  };
  timeout: number;
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
  flushInterval: number;
  remoteConfigFetchInterval: number;
  timeout: number;
  ignoredDomains: string[];
  allowedDomains: string[];
  allowLocalUrls: boolean;
  allowIpAddresses: boolean;
  remoteConfigFetchEndpoint: string; // Defaults to {baseUrl}/config if not provided
  eventSinkEndpoint: string; // Defaults to {baseUrl}/events if not provided
  errorSinkEndpoint: string; // Defaults to {baseUrl}/errors if not provided
  telemetryEndpoint: string; // Defaults to {baseUrl}/telemetry if not provided
  waitAfterClose: number;
  remoteConfig: RemoteConfigType;
  useRemoteConfig: boolean;
  useTelemetry: boolean;
  logRequestHeaders: boolean;
  logRequestBody: boolean;
  logResponseHeaders: boolean;
  logResponseBody: boolean;
  forceRedactAll: boolean;
  redactByDefault: boolean;
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
  sensitiveKeys: Array<{ keyPath: string, action: string }>;
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

type TagType = Record<string, string | number | string[]>;

interface EventRequestType {
  request: RequestType;
  response: ResponseType;
  tags?: TagType;
  metadata?: {
    sensitiveKeys: Array<SensitiveKeyMetadata>;
    tags?: TagType;
  };
}

type SupergoodContext = {
  tags: TagType;
};

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
          action: string;
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
  TelemetryType,
  SupergoodContext,
  TagType
};
