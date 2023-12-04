import { HeaderOptionType, EventRequestType, ErrorPayloadType } from './types';
import { post, get } from './utils';

const postError = async (
  errorSinkUrl: string,
  errorPayload: ErrorPayloadType,
  options: HeaderOptionType
) => {
  try {
    const response = await post(
      errorSinkUrl,
      errorPayload,
      options.headers.Authorization
    );
    return response;
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
  const response = await post(
    eventSinkUrl,
    data,
    options.headers.Authorization
  );

  return response;
};

const fetchConfig = async (configUrl: string, options: HeaderOptionType) => {
  const response = await get(configUrl, options.headers.Authorization);
  return response;
}

export { postError, postEvents };
