import {
  HeaderOptionType,
  InfoPayloadType,
  RequestType,
  ResponseType,
  EventRequestType,
  ErrorPayloadType,
  ConfigType,
  RemoteConfigType,
  EndpointConfigType
} from './types';
import crypto from 'node:crypto';
import { postError } from './api';
import { name, version } from '../package.json';
import https from 'https';
import http from 'http';
import { errors } from './constants';

import _set from 'lodash.set';
import _get from 'lodash.get';

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
      console.error(
        new Date().toISOString(),
        `${packageName}@${packageVersion}: ${message}`,
        JSON.stringify(payload, null, 2),
        error
      );
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
  clientSecret: string
): HeaderOptionType => {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(
        clientId + ':' + clientSecret
      ).toString('base64')}`
    }
  };
};

const marshalKeypath = (keypath: string) => {
  const [first] = keypath.split('.');
  if(first === 'request_headers') return keypath.replace('request_headers', 'request.headers');
  if(first === 'request_body') return keypath.replace('request_body', 'request.body');
  if(first === 'response_headers') return keypath.replace('response_headers', 'response.headers');
  if(first === 'response_body') return keypath.replace('response_body', 'response.body');
  return keypath;
}

const redactValuesFromKeys = (
  obj: { request?: RequestType; response?: ResponseType },
  remoteConfig: RemoteConfigType
) => {
  const endpointConfig = getEndpointConfigForRequest(obj.request as RequestType, remoteConfig);
  if (!endpointConfig || !endpointConfig?.sensitiveKeys?.length) return obj;
  else {
    const sensitiveKeys = endpointConfig.sensitiveKeys;
    let objCopy = { ...obj };
    for (let i = 0; i < sensitiveKeys.length; i++) {
      const keyPath = marshalKeypath(sensitiveKeys[i]);
      const value = _get(objCopy, keyPath);
      if (value) {
        objCopy = _set(objCopy, keyPath, redactValue(value));
      }
    }
    return objCopy;
  }
};

const safeParseJson = (json: string) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return json;
  }
};

const redactValue = (
  input: string | Record<string, string> | [Record<string, string>] | undefined
) => {
  let dataLength;
  let dataType;

  if(!input) {
    dataLength = 0;
    dataType = 'null';
  }
  else if (Array.isArray(input)) {
    dataLength = input.length;
    dataType = 'array';
  }
  else if (typeof input === 'object') {
    dataLength = new Blob([input.toString()]).size;
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
  return `redacted:${dataLength}:${dataType}`
};

const prepareData = (
  events: Array<EventRequestType>,
  remoteConfig: RemoteConfigType,
) => {
  return events.filter((e) => redactValuesFromKeys(e, remoteConfig));
};

const post = (
  url: string,
  data: Array<EventRequestType> | ErrorPayloadType,
  authorization: string
): Promise<string> => {
  const dataString = JSON.stringify(data);
  const packageVersion = version;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': dataString.length,
      Authorization: authorization,
      'supergood-api': 'supergood-js',
      'supergood-api-version': packageVersion
    },
    timeout: 5000 // in ms
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
}

const get = (
  url: string,
  authorization: string
): Promise<string> => {
  const packageVersion = version;

  const options = {
    method: 'GET',
    headers: {
      Authorization: authorization,
      'supergood-api': 'supergood-js',
      'supergood-api-version': packageVersion
    },
    timeout: 5000 // in ms
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
}

type RemoteConfigPayload = Array<{
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


const processRemoteConfig = (remoteConfigPayload: RemoteConfigPayload) => {
  return (remoteConfigPayload || []).reduce((remoteConfig, domainConfig) => {
    const { domain, endpoints } = domainConfig;
    const endpointConfig = endpoints.reduce((endpointConfig, endpoint) => {
      const { matchingRegex, endpointConfiguration } = endpoint;
      const { regex, location } = matchingRegex;
      const { action, sensitiveKeys } = endpointConfiguration;
      endpointConfig[regex] = {
        location,
        regex,
        ignored: action === 'Ignore',
        sensitiveKeys: (sensitiveKeys || []).map((key) => key.keyPath)
      };
      return endpointConfig;
    }, {} as { [endpointName: string]: EndpointConfigType });
    remoteConfig[domain] = endpointConfig;
    return remoteConfig;
  }, {} as RemoteConfigType);
}

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getStrRepresentationFromPath = (request: RequestType, location: string) => {
  const url = new URL(request.url);
  if(location === 'domain') return url.hostname.toString();
  if(location === 'url') return url.toString();
  if(location === 'path') return url.pathname.toString();
  if(location === 'request_headers') return request.headers.toString();
  if(location === 'request_body') return request.body?.toString();
  return request[location as keyof RequestType]?.toString();
}

const getEndpointConfigForRequest = (request: RequestType, remoteConfig: RemoteConfigType) => {
  const domains = Object.keys(remoteConfig);
  const domain = domains.find((domain) => request.url.includes(domain));
  // If the domain doesn't exist in the config, then we return nothing
  if (!domain) return null;
  const endpointConfigs = remoteConfig[domain];
  for (let i = 0; i < Object.keys(endpointConfigs).length; i++) {
    const endpointConfig = endpointConfigs[i];
    const { regex, location } = endpointConfig;
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
}

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
  getEndpointConfigForRequest
};
