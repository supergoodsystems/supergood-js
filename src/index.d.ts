import { IsomorphicRequest, IsomorphicResponse } from '@mswjs/interceptors';

interface HeaderOptionType {
  headers: {
    'Content-Type': string;
    Authorization: string;
  };
}

interface RequestType {
  id: string;
  method: string;
  origin: string;
  protocol: string;
  hostname: string;
  host: string;
  pathname: string;
  search: string;
  body: string;
  requestedAt: Date;
}

interface ResponseType {
  status: number;
  body: string;
  respondedAt: Date;
}

interface OptionsType {
  flushInterval: number;
  cacheTtl: number;
  baseUrl: string;
  hashBody: boolean;
  eventSinkUrl: string; // Defaults to {baseUrl}/api/events if not provided
  errorSinkUrl: string; // Defaults to {baseUrl}/api/errors if not provided
}

interface HttpPayloadType {
  request: RequestType;
  response: ResponseType;
}

interface InfoPayloadType {
  options: OptionsType;
  request?: IsomorphicRequest;
  response?: IsomorphicResponse;
  data?: HttpPayloadType[];
  packageName?: string;
  packageVersion?: string;
}

interface LoggerType {
  error: (message: string, payload: InfoPayloadType, error: Error) => void;
  info: (message: string, payload: InfoPayloadType) => void;
}

export {
  HeaderOptionType,
  RequestType,
  ResponseType,
  HttpPayloadType,
  InfoPayloadType,
  LoggerType,
  OptionsType
};
