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
  requestBody: string;
  requestedAt: Date;
}

interface ResponseType {
  status: number;
  responseBody: string;
  respondedAt: Date;
}

interface SupergoodConfigType {
  keysToHash: Array<string>;
  flushInterval: number;
  cacheTtl: number;
  eventSinkUrl: string; // Defaults to {baseUrl}/api/events if not provided
}

interface SupergoodPayloadType {
  request: RequestType;
  response: ResponseType;
}

export {
  HeaderOptionType,
  RequestType,
  ResponseType,
  SupergoodPayloadType,
  SupergoodConfigType
};
