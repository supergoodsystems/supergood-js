import * as api from '../../src/api';

export function mockApi() {
  const postEventsMock = jest
    .spyOn(api, 'postEvents')
    .mockImplementation(async (_, data) => ({ data } as any));
  const postErrorMock = jest
    .spyOn(api, 'postError')
    .mockImplementation(async (_, payload) => ({ payload } as any));
  const fetchRemoteConfigMock = jest
    .spyOn(api, 'fetchRemoteConfig')
    .mockImplementation(async () => ([] as any));

  return { postEventsMock, postErrorMock, fetchRemoteConfigMock };
}
