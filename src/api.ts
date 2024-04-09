import { HeaderOptionType, EventRequestType, ErrorPayloadType, TelemetryType } from './types';
import { post, get } from './utils';

const postError = async (
  errorSinkUrl: string,
  errorPayload: ErrorPayloadType,
  options: HeaderOptionType,
) => {
  try {
    const response = await post(
      errorSinkUrl,
      errorPayload,
      options.headers.Authorization,
      options.timeout
    );
    return response;
  } catch (e) {
    console.warn(`Failed to report error to ${errorSinkUrl}`);
    console.warn(JSON.stringify(e, ['stack', 'message']))
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
    options.headers.Authorization,
    options.timeout
  );
  return response;
};

const postTelemetry = async (
  telemetryUrl: string,
  data: TelemetryType,
  options: HeaderOptionType
) => {
  const response = await post(
    telemetryUrl,
    data,
    options.headers.Authorization,
    options.timeout
  );
  return response;
}

const fetchRemoteConfig = async (configUrl: string, options: HeaderOptionType) => {
  const response = await get(configUrl, options.headers.Authorization, options.timeout);
  return JSON.parse(response);
}

export { postError, postEvents, fetchRemoteConfig, postTelemetry };
