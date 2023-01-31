import { InfoPayloadType, HeaderOptionType, HttpPayloadType } from './index.d';
import axios from 'axios';

const postError = async (
  errorSinkUrl: string,
  errorPayload: InfoPayloadType,
  options: HeaderOptionType
) => {
  const response = await axios.post(errorSinkUrl, errorPayload, options);
  if (response.status === 200) {
    return response.data;
  } else {
    return {};
  }
};

const postEvents = async (
  eventSinkUrl: string,
  data: Array<HttpPayloadType>,
  options: HeaderOptionType
) => {
  const response = await axios.post(eventSinkUrl, data, options);
  if (response.status === 200) {
    return response.data;
  } else {
    return {};
  }
};

export { postError, postEvents };
