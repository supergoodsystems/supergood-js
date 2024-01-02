import * as api from '../../src/api';
import { RemoteConfigPayloadType } from '../../src/types';

export const mockApi = (
  {
    postErrorsResponse,
    postEventsResponse,
    fetchRemoteConfigResponse,
    fetchRemoteConfigFunction,
  }:
  { postErrorsResponse?: any,
    postEventsResponse?: any,
    fetchRemoteConfigResponse?: RemoteConfigPayloadType,
    fetchRemoteConfigFunction?: () => Promise<any>,
  } = {}
) => {

  const postEventsMock = jest
    .spyOn(api, 'postEvents')
    .mockImplementation((async (_, data) => postEventsResponse ?? ({ data } as any)));

  const postErrorMock = jest
    .spyOn(api, 'postError')
    .mockImplementation((async (_, payload) => postErrorsResponse ?? ({ payload } as any)));

  const fetchRemoteConfigMock = jest
    .spyOn(api, 'fetchRemoteConfig')
    .mockImplementation(fetchRemoteConfigFunction ?? (async () => fetchRemoteConfigResponse ?? ([] as any)));

  const postTelemetryMock = jest
    .spyOn(api, 'postTelemetry')
    .mockImplementation((async (_, payload) => ({ payload } as any)));

  return { postEventsMock, postErrorMock, fetchRemoteConfigMock, postTelemetryMock };
}
