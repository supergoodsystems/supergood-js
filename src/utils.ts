import {
  HeaderOptionType,
  InfoPayloadType,
  RequestType,
  ResponseType,
  EventRequestType,
  ConfigType,
  ErrorPayloadType
} from './types';
import crypto from 'node:crypto';
import { postError } from './api';
import { name, version } from '../package.json';
import https from 'https';
import http from 'http';
import { errors } from './constants';

import set from 'lodash.set';
import get from 'lodash.get';

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

const hashValuesFromKeys = (
  obj: { request?: RequestType; response?: ResponseType },
  keysToHash: Array<string>
) => {
  let objCopy = { ...obj };
  for (let i = 0; i < keysToHash.length; i++) {
    const keyString = keysToHash[i];
    const value = get(objCopy, keyString);
    if (value) {
      objCopy = set(objCopy, keyString, hashValue(value));
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

const hashValue = (
  input: string | Record<string, string> | [Record<string, string>] | undefined
) => {
  const hash = crypto.createHash('sha1');
  if (!input) return '';

  if (Array.isArray(input)) {
    return [hash.update(JSON.stringify(input)).digest('base64')];
  }
  if (typeof input === 'object') {
    return { hashed: hash.update(JSON.stringify(input)).digest('base64') };
  }
  if (typeof input === 'string') {
    return hash.update(input).digest('base64');
  }
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
  return events.filter((e) => hashValuesFromKeys(e, keysToHash));
};

const shouldCachePayload = (url: string, baseUrl: string) => {
  const requestUrl = new URL(url);
  const baseOriginUrl = new URL(baseUrl);

  // Origin is needed for 'localhost' testing rather than hostname
  if (requestUrl.origin == baseOriginUrl.origin) {
    return false;
  }

  return true;
};

function post(
  url: string,
  data: Array<EventRequestType> | ErrorPayloadType,
  authorization: string
): Promise<string> {
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

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export {
  getHeaderOptions,
  hashValue,
  hashValuesFromKeys,
  logger,
  safeParseJson,
  prepareData,
  shouldCachePayload,
  sleep,
  post
};
