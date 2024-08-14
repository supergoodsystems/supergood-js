import { HeaderOptionType, EventRequestType, ErrorPayloadType, TelemetryType } from './types';
declare const postError: (errorSinkUrl: string, errorPayload: ErrorPayloadType, options: HeaderOptionType) => Promise<string | null>;
declare const postEvents: (eventSinkUrl: string, data: Array<EventRequestType>, options: HeaderOptionType) => Promise<string>;
declare const postTelemetry: (telemetryUrl: string, data: TelemetryType, options: HeaderOptionType) => Promise<string>;
declare const fetchRemoteConfig: (configUrl: string, options: HeaderOptionType) => Promise<any>;
export { postError, postEvents, fetchRemoteConfig, postTelemetry };
