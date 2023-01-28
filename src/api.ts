import {
  HeaderOptionType,
  SupergoodPayloadType,
  SupergoodConfigType
} from './types';
import axios from 'axios';
import fs from 'fs';

const DEFAULT_CONFIG = {
  keysToHash: ['request.body', 'response.body'],
  flushInterval: 1000,
  cacheTtl: 0
};

const getConfig = async (
  baseUrl: string,
  options: HeaderOptionType
): Promise<SupergoodConfigType> => {
  const defaultConfig = { ...DEFAULT_CONFIG, eventSinkUrl: baseUrl };
  try {
    const response = await axios.get(`${baseUrl}/api/config`, options);
    if (response.status === 200) {
      return response.data;
    } else {
      return defaultConfig;
    }
  } catch (e) {
    return defaultConfig;
  }
};

const postEvents = async (
  eventSinkUrl: string,
  data: Array<SupergoodPayloadType>,
  options: HeaderOptionType
) => {
  const response = await axios.post(eventSinkUrl, data, options);
  if (response.status === 200) {
    return response.data;
  } else {
    return {};
  }
};

const dumpDataToDisk = (data: Array<SupergoodPayloadType>) => {
  const logFileName = `supergood_${new Date()
    .toISOString()
    .replace(/[:|.]/g, '-')}.log`;
  const dataStr = JSON.stringify(data, null, 2);
  fs.writeFileSync(logFileName, dataStr, {});
};

export { postEvents, dumpDataToDisk, getConfig };
