import {
  HeaderOptionType,
  InfoPayloadType,
  RequestType,
  ResponseType,
  EventRequestType,
  ErrorPayloadType,
  ConfigType
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
      console.log({ reportOut, errorSinkUrl });
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

// format: redacted:<data-length>:<data-type>
const redactedValuesFromKeys = (
  obj: { request?: RequestType; response?: ResponseType },
  keysToHash: Array<string>
) => {
  let objCopy = { ...obj };
  for (let i = 0; i < keysToHash.length; i++) {
    const keyString = keysToHash[i];
    const value = _get(objCopy, keyString);
    if (value) {
      objCopy = _set(objCopy, keyString, redactedValue(value));
    }
  }
  return objCopy;
};

const safeParseJson = (json: string) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return json;
  }
};

const redactedValue = (
  input: string | Record<string, string> | [Record<string, string>] | undefined
) => {
  if (!input) return '';
  let dataLength = new Blob([input as any]).size;
  const dataType = typeof input;
  return `redacted:${dataLength}:${dataType}`;
};

const getPayloadSize = (
  input: string | Record<string, string> | [Record<string, string>] | undefined
) => {
  if (!input) return 0;

  if (Array.isArray(input)) {
    return JSON.stringify(input).length;
  }
  if (typeof input === 'object') {
    return JSON.stringify(input).length;
  }
  if (typeof input === 'string') {
    return input.length;
  }
};

const prepareData = (
  events: Array<EventRequestType>,
  keysToHash: Array<string>
) => {
  return events.filter((e) => redactedValuesFromKeys(e, keysToHash));
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

const processRemoteConfig = (oldConfig: ConfigType, newConfig: ConfigType) => {
  const { ignoredDomains, keysToHash } = oldConfig;
}

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export {
  getHeaderOptions,
  redactedValue,
  redactedValuesFromKeys,
  logger,
  safeParseJson,
  prepareData,
  sleep,
  post,
  get
};
