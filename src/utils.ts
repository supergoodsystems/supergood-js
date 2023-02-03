import {
  HeaderOptionType,
  InfoPayloadType,
  LoggerType,
  EventRequestType,
  OptionsType
} from './types';
import { errors } from './constants';
import fs from 'fs';
import crypto from 'crypto';
import { postError } from './api';
import { name, version } from '../package.json';

const logger = (errorSinkUrl: string, headerOptions: HeaderOptionType) => {
  const packageName = name;
  const packageVersion = version;
  return {
    error: (msg: string, payload: InfoPayloadType, e: Error) => {
      console.error(
        `${packageName}@${packageVersion}: ${msg}`,
        JSON.stringify(payload, null, 2),
        e
      );
      postError(
        errorSinkUrl,
        { ...payload, packageName, packageVersion },
        headerOptions
      );
    },
    info: (msg: string, payload?: InfoPayloadType) => {
      console.log(
        `${packageName}@${packageVersion}: ${msg}`,
        payload ?? JSON.stringify(payload, null, 2)
      );
    },
    debug: (msg: string, payload?: InfoPayloadType) => {
      if (process.env.SUPERGOOD_LOG_LEVEL === 'debug') {
        console.log(
          `${packageName}@${packageVersion}: ${msg}`,
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

const hashValue = (input: string | Record<string, string> | undefined) => {
  const hash = crypto.createHash('sha1');
  if (!input) return '';
  if (typeof input === 'object') {
    return hash.update(JSON.stringify(input)).digest('base64');
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
  options: OptionsType
) => {
  // Only create a logfile once a day
  try {
    const logFileName = `supergood-${new Date()
      .toISOString()
      .split('T')[0]
      .replace(/[:|.]/g, '-')}.log`;
    log.info(`Writing to disk: "${logFileName}"`, { data, options });
    data.forEach((payload) =>
      fs.writeFileSync(logFileName, JSON.stringify(payload, null, 2), {
        flag: 'a+'
      })
    );
  } catch (e) {
    log.error(errors.WRITING_TO_DISK, { data, options }, e as Error);
  }
};

export { getHeaderOptions, hashValue, logger, dumpDataToDisk };
