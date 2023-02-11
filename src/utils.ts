import {
  HeaderOptionType,
  InfoPayloadType,
  LoggerType,
  EventRequestType,
  ConfigType,
  RequestType,
  ResponseType
} from './types';
import { errors } from './constants';
import fs from 'fs';
import crypto from 'crypto';
import { postError } from './api';
import { name, version } from '../package.json';

import set from 'lodash.set';
import get from 'lodash.get';

const logger = (errorSinkUrl: string, headerOptions: HeaderOptionType) => {
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
      if (reportOut) {
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

const hashValuesFromkeys = (
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

const hashValue = (input: string | Record<string, string> | undefined) => {
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

// If the service is down, save the log files locally to
// be recovered later
const dumpDataToDisk = (
  data: Array<EventRequestType>,
  log: LoggerType,
  config: ConfigType
) => {
  // Only create a logfile once a day
  try {
    const logFileName = `supergood-${new Date()
      .toISOString()
      .split('T')[0]
      .replace(/[:|.]/g, '-')}.log`;
    log.info(`Writing to disk: "${logFileName}"`, { data, config });
    data.forEach((payload) =>
      fs.writeFileSync(logFileName, JSON.stringify(payload, null, 2), {
        flag: 'a+'
      })
    );
  } catch (e) {
    log.error(errors.WRITING_TO_DISK, { data, config }, e as Error);
  }
};

export {
  getHeaderOptions,
  hashValue,
  hashValuesFromkeys,
  logger,
  dumpDataToDisk,
  safeParseJson
};
