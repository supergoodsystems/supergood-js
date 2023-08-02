import { HeaderOptionType, EventRequestType, ErrorPayloadType } from './types';
import { errors } from './constants';

const postError = async (
  errorSinkUrl: string,
  errorPayload: ErrorPayloadType,
  options: HeaderOptionType
) => {
  try {
    const response = await fetch(errorSinkUrl, {
      method: 'POST',
      body: JSON.stringify(errorPayload),
      headers: options.headers
    });
    const data = await response.json();
    return data;
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
  const response = await fetch(eventSinkUrl, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: options.headers
  });
  const responseData = await response.json();

  if (response.status === 401) {
    throw new Error(errors.UNAUTHORIZED);
  }
  if (!responseData || response.status !== 200) {
    throw new Error(errors.POSTING_EVENTS);
  }
  return responseData;
};

export { postError, postEvents };
