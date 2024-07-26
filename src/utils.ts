import {
  HeaderOptionType,
  InfoPayloadType,
  RequestType,
  ResponseType,
  EventRequestType,
  ErrorPayloadType,
  RemoteConfigPayloadType,
  RemoteConfigType,
  EndpointConfigType,
  SensitiveKeyMetadata,
  TelemetryType,
  ConfigType,
  TagType
} from './types';
import { postError } from './api';
import { name, version } from '../package.json';
import https from 'https';
import http from 'http';
import { errors, ContentType } from './constants';
import { get as _get, set as _set } from 'lodash';
import { SensitiveKeyActions, EndpointActions } from './constants';

const logger = ({
  errorSinkUrl,
  headerOptions
}: {
  errorSinkUrl?: string;
  headerOptions: HeaderOptionType;
}) => {
  const packageName = name;
  const packageVersion = version;
  return {
    error: (
      message: string,
      payload: InfoPayloadType,
      error: Error,
      { reportOut }: { reportOut: boolean } = { reportOut: true }
    ) => {
      if (process.env.SUPERGOOD_LOG_LEVEL === 'debug') {
        console.error(
          new Date().toISOString(),
          `${packageName}@${packageVersion}: ${message}`,
          JSON.stringify(payload, null, 2),
          error
        );
      }
      if (reportOut && errorSinkUrl) {
        postError(
          errorSinkUrl,
          {
            payload: { ...payload, packageName, packageVersion },
            error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            message
          },
          headerOptions
        );
      }
    },
    info: (message: string, payload?: InfoPayloadType) => {
      console.log(
        new Date().toISOString(),
        `${packageName}@${packageVersion}: ${message}`,
        payload ?? JSON.stringify(payload, null, 2)
      );
    },
    debug: (message: string, payload?: any) => {
      if (process.env.SUPERGOOD_LOG_LEVEL === 'debug') {
        console.log(
          new Date().toISOString(),
          `${packageName}@${packageVersion}: ${message}`,
          payload ?? JSON.stringify(payload, null, 2)
        );
      }
    }
  };
};

const getHeaderOptions = (
  clientId: string,
  clientSecret: string,
  timeout: number
): HeaderOptionType => {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(
        clientId + ':' + clientSecret
      ).toString('base64')}`
    },
    timeout
  };
};

const marshalKeyPath = (keypath: string) => {
  if (/^requestHeaders/.test(keypath))
    return keypath.replace('requestHeaders', 'request.headers');
  if (/^requestBody/.test(keypath))
    return keypath.replace('requestBody', 'request.body');
  if (/^responseHeaders/.test(keypath))
    return keypath.replace('responseHeaders', 'response.headers');
  if (/^responseBody/.test(keypath))
    return keypath.replace('responseBody', 'response.body');
  return keypath;
};

const unmarshalKeyPath = (keypath: string) => {
  if (/^request\.headers/.test(keypath))
    return keypath.replace('request.headers', 'requestHeaders');
  if (/^request\.body/.test(keypath))
    return keypath.replace('request.body', 'requestBody');
  if (/^response\.headers/.test(keypath))
    return keypath.replace('response.headers', 'responseHeaders');
  if (/^response\.body/.test(keypath))
    return keypath.replace('response.body', 'responseBody');
  return keypath;
};

const expandSensitiveKeySetForArrays = (
  obj: any,
  sensitiveKeys: Array<{ keyPath: string; action: string }>
): Array<{ keyPath: string; action: string }> => {
  const expandKey = (
    key: { keyPath: string; action: string },
    obj: any
  ): Array<{ keyPath: string; action: string }> => {
    // Split the key by dots, considering the array brackets as part of the key
    const parts = key?.keyPath.match(/[^.\[\]]+|\[\d*\]|\[\*\]/g) || [];
    // Recursively expand the key
    return expand(parts, obj, { action: key.action, keyPath: '' });
  };

  const expand = (
    parts: string[],
    obj: any,
    key: { keyPath: string; action: string }
  ): Array<{ keyPath: string; action: string }> => {
    const path = key.keyPath;
    if (parts.length === 0) {
      return [{ keyPath: path, action: key.action }]; // Remove trailing dot
    }

    const part = parts[0];
    const isProperty = !part.startsWith('[');
    const separator = path && isProperty ? '.' : '';

    // Check for array notations
    if (/\[\*?\]/.test(part)) {
      if (!Array.isArray(obj)) {
        return [];
      }
      // Expand for each element in the array
      return obj.flatMap((_, index) =>
        expand(parts.slice(1), obj[index], {
          keyPath: `${path}${separator}[${index}]`,
          action: key.action
        })
      );
    } else if (part.startsWith('[') && part.endsWith(']')) {
      // Specific index in the array
      const index = parseInt(part.slice(1, -1), 10);
      if (!isNaN(index) && index < obj.length) {
        return expand(parts.slice(1), obj[index], {
          keyPath: `${path}${separator}${part}`,
          action: key.action
        });
      } else {
        return [];
      }
    } else {
      // Regular object property
      if (obj && typeof obj === 'object' && part in obj) {
        return expand(parts.slice(1), obj[part], {
          keyPath: `${path}${separator}${part}`,
          action: key.action
        });
      } else {
        return [];
      }
    }
  };

  return sensitiveKeys.flatMap((key) => expandKey(key, obj));
};

function getKeyPaths(obj: any, path: string = ''): string[] {
  let paths: string[] = [];

  if (typeof obj === 'object' && obj !== null) {
    // Object.keys returns indices for arrays
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const newPath = Array.isArray(obj)
        ? `${path}[${key}]`
        : `${path}${path ? '.' : ''}${key}`;
      if (typeof value === 'object' && value !== null) {
        paths = paths.concat(getKeyPaths(value, newPath));
      } else {
        paths.push(newPath);
      }
    });
  } else {
    paths.push(path);
  }

  return paths;
}

const getAllKeyPathsForLeavesOnEvent = (event: {
  request?: RequestType;
  response?: ResponseType;
}) =>
  [
    ...getKeyPaths(event.request?.headers, 'request.headers'),
    ...getKeyPaths(event.request?.body, 'request.body'),
    ...getKeyPaths(event.response?.headers, 'response.headers'),
    ...getKeyPaths(event.response?.body, 'response.body')
  ].map((key) => ({ keyPath: key, action: SensitiveKeyActions.REDACT }));

const redactValuesFromKeys = (
  event: {
    request?: RequestType;
    response?: ResponseType;
    tags?: TagType;
    trace?: string;
  },
  config: ConfigType
): {
  event: { request?: RequestType; response?: ResponseType };
  sensitiveKeyMetadata: Array<SensitiveKeyMetadata>;
  tags: TagType;
  trace?: string;
} => {
  const { redactByDefault, forceRedactAll } = config;
  const remoteConfig = config?.remoteConfig || ({} as RemoteConfigType);
  // Move the tags off the event object and into the metadata object
  let tags = {};
  let trace;
  if (event.tags) {
    tags = event.tags;
    delete event.tags;
  }
  if (event?.trace) {
    trace = event.trace;
    delete event.trace;
  }

  let sensitiveKeyMetadata: Array<SensitiveKeyMetadata> = [];
  const endpointConfig = getEndpointConfigForRequest(
    event.request as RequestType,
    remoteConfig
  );

  if (
    (!endpointConfig || !endpointConfig?.sensitiveKeys?.length) &&
    !redactByDefault &&
    !forceRedactAll
  ) {
    return { event, sensitiveKeyMetadata, tags, trace };
  } else {
    let sensitiveKeys = expandSensitiveKeySetForArrays(
      event,
      (endpointConfig?.sensitiveKeys || []).map((key) => ({
        keyPath: marshalKeyPath(key.keyPath),
        action: key.action
      }))
    );

    if (forceRedactAll) {
      // Sensitive keys = every leaf on the event
      sensitiveKeys = getAllKeyPathsForLeavesOnEvent(event) || [];
    } else if (redactByDefault) {
      // Sensitive keys = All of the leaves on the event EXCEPT the ones marked allwoed from the remote config
      sensitiveKeys = (getAllKeyPathsForLeavesOnEvent(event) || []).filter(
        (key) =>
          !sensitiveKeys.some(
            (sk) =>
              sk.keyPath === key.keyPath &&
              sk.action === SensitiveKeyActions.ALLOW
          )
      );
    } else {
      sensitiveKeys = sensitiveKeys.filter(
        (sk) => sk.action !== SensitiveKeyActions.ALLOW
      );
    }

    for (let i = 0; i < sensitiveKeys.length; i++) {
      const key = sensitiveKeys[i];
      // Add sensitive key for array expansion
      const value = _get(event, key.keyPath);
      if (value) {
        _set(event, key.keyPath, null);
        // Don't return <string-length>:<string-type> for null values
        sensitiveKeyMetadata.push({
          keyPath: unmarshalKeyPath(key.keyPath),
          ...redactValue(value)
        });
      }
    }
    return { event, sensitiveKeyMetadata, tags, trace };
  }
};

const partition = (s: string, seperator: string) => {
  const index = s.indexOf(seperator);
  if (index === -1) {
    return [s, '', ''];
  } else {
    return [s.slice(0, index), seperator, s.slice(index + seperator.length)];
  }
};

const parseOneAsSSE = (chunk: string) => {
  // IF chunk is a single valid SSE event, returns chunk as an SSE object
  // if not, returns null
  const data: any[] = [];
  let event;
  let id;
  let retry;
  const splits = chunk.split(/\r?\n/);
  for (let i = 0; i < splits.length; i++) {
    const line = splits[i];
    if (line === '') {
      // empty newline = dispatch
      return {
        event,
        id,
        data,
        retry
      };
    }
    // otherwise keep building SSE
    if (line.startsWith(':')) {
      // per SSE spec, this is invalid.
      return null;
    }
    let [fieldName, separator, value] = partition(line, ':');
    if (separator === '') {
      // indicates the partition failed. can't be a SSE
      return null;
    }

    value = value.trimStart();
    switch (fieldName) {
      case 'event':
        event = value;
        break;
      case 'data':
        data.push(safeParseJson(value));
        break;
      case 'id':
        if (!value.includes('\0')) {
          id = value;
        }
        break;
      case 'retry':
        retry = safeParseInt(value);
        break;
    }
  }
  // No dispatch instruction, currently not a valid SSE
  return null;
};

const parseAsSSE = (stream: string) => {
  // If `stream` is a valid stream of server side events,
  //    returns an array of JSON-parsed server side events
  // Else
  //    returns null
  const splits = stream.split(/(?<=\n)/);
  if (splits.length === 0) {
    // SSE streams require newlines
    return null;
  }

  let data = '';
  const responseBody = splits
    .map((split) => {
      data += split;
      if (
        data.endsWith('\n\n') ||
        data.endsWith('\r\r') ||
        data.endsWith('\r\n\r\n')
      ) {
        // Check if data is a valid SSE
        const sse = parseOneAsSSE(data);
        if (sse) {
          // reset data to start building the next SSE
          data = '';
          return sse;
        }
      }
    })
    .filter((sse) => !!sse);
  // if there were no valid server sent events, return the original string
  // otherwise, return an array of SSE
  return responseBody?.length ? responseBody : null;
};

const safeParseJson = (json: string) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return json;
  }
};

const safeParseInt = (int: string) => {
  try {
    const parsed = parseInt(int, 10);
    if (!isNaN(parsed)) {
      return int;
    }
  } finally {
    return null;
  }
};

const parseResponseBody = (rawResponseBody: string, contentType?: string) => {
  if (contentType?.includes(ContentType.EventStream)) {
    return parseAsSSE(rawResponseBody);
  } else {
    return safeParseJson(rawResponseBody);
  }
};

const redactValue = (
  input: string | Record<string, string> | [Record<string, string>] | undefined
) => {
  let dataLength;
  let dataType;

  if (!input) {
    dataLength = 0;
    dataType = 'null';
  } else if (Array.isArray(input)) {
    dataLength = input.length;
    dataType = 'array';
  } else if (typeof input === 'object') {
    dataLength = new Blob([JSON.stringify(input)]).size;
    dataType = 'object';
  } else if (typeof input === 'string') {
    dataLength = input.length;
    dataType = 'string';
  } else if (typeof input === 'number') {
    dataLength = (input as number).toString().length;
    dataType = Number.isInteger(input) ? 'integer' : 'float';
  } else if (typeof input === 'boolean') {
    dataLength = 1;
    dataType = 'boolean';
  }
  return { length: dataLength, type: dataType };
};

const prepareData = (
  events: Array<EventRequestType>,
  supergoodConfig: ConfigType
) => {
  return events.map((e) => {
    const { event, sensitiveKeyMetadata, tags, trace } = redactValuesFromKeys(
      e,
      supergoodConfig
    );
    return {
      ...event,
      metadata: { sensitiveKeys: sensitiveKeyMetadata, tags, trace }
    };
  });
};

const getByteSize = (s: string) => {
  return new TextEncoder().encode(s).length;
};

const post = (
  url: string,
  data: Array<EventRequestType> | ErrorPayloadType | TelemetryType,
  authorization: string,
  timeout: number
): Promise<string> => {
  const dataString = JSON.stringify(data);
  const packageVersion = version;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': getByteSize(dataString),
      Authorization: authorization,
      'supergood-api': 'supergood-js',
      'supergood-api-version': packageVersion
    },
    timeout // in ms
  };

  return new Promise((resolve, reject) => {
    const transport = url.startsWith('https') ? https : http;
    const req = transport.request(url, options, (res) => {
      if (res && res.statusCode) {
        if (res.statusCode === 401) {
          return reject(new Error(errors.UNAUTHORIZED));
        }

        if (res.statusCode < 200 || res.statusCode > 299) {
          return reject(new Error(`HTTP status code ${res.statusCode}`));
        }
      }

      const body = [] as Buffer[];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => {
        const resString = Buffer.concat(body).toString();
        resolve(resString);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request time out'));
    });

    req.write(dataString);
    req.end();
  });
};

const get = (
  url: string,
  authorization: string,
  timeout: number
): Promise<string> => {
  const packageVersion = version;

  const options = {
    method: 'GET',
    headers: {
      Authorization: authorization,
      'supergood-api': 'supergood-js',
      'supergood-api-version': packageVersion
    },
    timeout // in ms
  };

  return new Promise((resolve, reject) => {
    const transport = url.startsWith('https') ? https : http;
    const req = transport.request(url, options, (res) => {
      if (res && res.statusCode) {
        if (res.statusCode === 401) {
          return reject(new Error(errors.UNAUTHORIZED));
        }

        if (res.statusCode < 200 || res.statusCode > 299) {
          return reject(new Error(`HTTP status code ${res.statusCode}`));
        }
      }

      const body = [] as Buffer[];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => {
        const resString = Buffer.concat(body).toString();
        resolve(resString);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request time out'));
    });

    req.end(); // Notice there is no req.write() for GET requests
  });
};

const processRemoteConfig = (remoteConfigPayload: RemoteConfigPayloadType) => {
  return (remoteConfigPayload || []).reduce((remoteConfig, domainConfig) => {
    const { domain, endpoints } = domainConfig;
    const endpointConfig = endpoints.reduce((endpointConfig, endpoint) => {
      const { matchingRegex, endpointConfiguration, method } = endpoint;
      const { regex, location } = matchingRegex;
      const { action, sensitiveKeys } = endpointConfiguration;
      endpointConfig[regex] = {
        location,
        regex,
        method,
        ignored: action === EndpointActions.IGNORE,
        sensitiveKeys: (sensitiveKeys || []).map((key) => ({
          keyPath: key.keyPath,
          action: key.action
        }))
      };
      return endpointConfig;
    }, {} as { [endpointName: string]: EndpointConfigType });
    remoteConfig[domain] = endpointConfig;
    return remoteConfig;
  }, {} as RemoteConfigType);
};

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getStrRepresentationFromPath = (
  request: RequestType,
  location: string
) => {
  const url = new URL(request.url);
  if (location === 'domain') return url.hostname.toString();
  if (location === 'url') return url.toString();
  if (location === 'path') return url.pathname.toString();
  if (location === 'requestHeaders') return request.headers.toString();
  if (location === 'requestBody') return request.body?.toString();
  return request[location as keyof RequestType]?.toString();
};

const getEndpointConfigForRequest = (
  request: RequestType,
  remoteConfig: RemoteConfigType
) => {
  const domains = Object.keys(remoteConfig);
  const domain = domains.find((domain) => request.url.includes(domain));

  // If the domain doesn't exist in the config, then we return nothing
  if (!domain) return null;
  const endpointConfigs = remoteConfig[domain];

  for (let i = 0; i < Object.keys(endpointConfigs).length; i++) {
    const endpointConfig = endpointConfigs[Object.keys(endpointConfigs)[i]];
    const { regex, location, method } = endpointConfig;
    if (request.method.toLocaleLowerCase() !== method.toLocaleLowerCase()) {
      continue;
    }
    const regexObj = new RegExp(regex);
    const strRepresentation = getStrRepresentationFromPath(request, location);
    if (!strRepresentation) continue;
    else {
      const match = regexObj.test(strRepresentation);
      if (match) {
        return endpointConfig;
      }
    }
  }
  return null;
};

export {
  processRemoteConfig,
  getHeaderOptions,
  redactValue,
  redactValuesFromKeys,
  logger,
  safeParseJson,
  prepareData,
  sleep,
  post,
  get,
  getEndpointConfigForRequest,
  expandSensitiveKeySetForArrays,
  parseAsSSE,
  parseResponseBody
};
