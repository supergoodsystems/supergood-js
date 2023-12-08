import * as api from '../../src/api';
import { RemoteConfigPayloadType } from '../../src/types';

export const mockApi = (
  {
    postErrorsResponse,
    postEventsResponse,
    fetchRemoteConfigResponse
  }:
  { postErrorsResponse?: any,
    postEventsResponse?: any,
    fetchRemoteConfigResponse?: RemoteConfigPayloadType
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
    .mockImplementation((async () => fetchRemoteConfigResponse ?? ([] as any)));

  return { postEventsMock, postErrorMock, fetchRemoteConfigMock };
}
