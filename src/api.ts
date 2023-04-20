import {
  HeaderOptionType,
  EventRequestType,
  ErrorPayloadType,
  ConfigType
} from './types';
import { errors } from './constants';
import axios from 'axios';

const postError = async (
  errorSinkUrl: string,
  errorPayload: ErrorPayloadType,
  options: HeaderOptionType
) => {
  try {
    const response = await axios.post(errorSinkUrl, errorPayload, options);
    return response.data;
  } catch (e) {
    console.warn(`Failed to report error to ${errorSinkUrl}`);
    return null;
  }
};

const postEvents = async (
  eventSinkUrl: string,
  data: Array<EventRequestType>,
  options: HeaderOptionType
) => {
  const response = await axios.post(eventSinkUrl, data, options);
  if (response.status === 401) {
    throw new Error(errors.UNAUTHORIZED);
  }
  if (!response || response.status !== 200) {
    throw new Error(errors.POSTING_EVENTS);
  }
  return response.data;
};

export { postError, postEvents };
