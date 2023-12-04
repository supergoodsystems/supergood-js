interface HeaderOptionType {
  headers: {
    'Content-Type': string;
    Authorization: string;
    'content-encoding'?: string;
  };
}

type BodyType = Record<string, string>;

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
  ignoredDomains: string[];
  allowLocalUrls: boolean;
  cacheTtl: number;
  keysToHash: string[];
  eventSinkEndpoint: string; // Defaults to {baseUrl}/events if not provided
  errorSinkEndpoint: string; // Defaults to {baseUrl}/errors if not provided
  waitAfterClose: number;
}

interface MetadataType {
  numberOfEvents?: number;
  payloadSize?: number;
  requestUrls?: string[];
  requestUrl?: string;
  serviceName?: string;
}

interface EventRequestType {
  request: RequestType;
  response: ResponseType;
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
  MetadataType
};
