import { HeaderOptionType, EventRequestType, ErrorPayloadType } from './types';
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
  try {
    const response = await axios.post(eventSinkUrl, data, options);
    return response.data;
  } catch (e) {
    console.warn(`Failed to report events to ${eventSinkUrl}`);
    return null;
  }
};

export { postError, postEvents };
