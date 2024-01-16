import fetch from 'node-fetch';
import get from 'lodash.get';

import Supergood from '../../src';
import {
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_CONFIG,
  SUPERGOOD_SERVER
} from '../consts';
import { RemoteConfigPayloadType } from '../../src/types';
import { getEvents } from '../utils/function-call-args';
import { mockApi } from '../utils/mock-api';

describe('remote config functionality', () => {
  it('fetches remote config', async () => {
    const fetchRemoteConfigResponse = [] as RemoteConfigPayloadType;
    const { postEventsMock } = mockApi({ fetchRemoteConfigResponse });
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );
    await fetch(`${MOCK_DATA_SERVER}/posts`);
    await Supergood.close();
    expect(getEvents(postEventsMock).length).toEqual(1);
  });

  it('fetches remote config and ignores some endpoints', async () => {
    const fetchRemoteConfigResponse = [
      {
        domain: new URL(MOCK_DATA_SERVER).hostname,
        endpoints: [
          {
            name: '/posts',
            matchingRegex: {
              regex: '/posts',
              location: 'path'
            },
            endpointConfiguration: {
              action: 'Ignore',
              sensitiveKeys: []
            }
          }
        ]
      }
    ] as RemoteConfigPayloadType;
    const { postEventsMock } = mockApi({ fetchRemoteConfigResponse });
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );
    await fetch(`${MOCK_DATA_SERVER}/posts`);
    await fetch(`${MOCK_DATA_SERVER}/gzipped-response`);
    await Supergood.close();
    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted.length).toEqual(1);
  });

  it('fetches remote config and redacts sensitive keys', async () => {
    const fetchRemoteConfigResponse = [
      {
        domain: new URL(MOCK_DATA_SERVER).hostname,
        endpoints: [
          {
            name: '/profile',
            matchingRegex: {
              regex: '/profile',
              location: 'path'
            },
            endpointConfiguration: {
              action: 'Allow',
              sensitiveKeys: [
                {
                  keyPath: 'responseBody.name'
                }
              ]
            }
          }
        ]
      }
    ] as RemoteConfigPayloadType;
    const { postEventsMock } = mockApi({ fetchRemoteConfigResponse });
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );
    await fetch(`${MOCK_DATA_SERVER}/profile`);
    await Supergood.close();
    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted.length).toEqual(1);
    expect(get(eventsPosted[0], 'metadata.sensitiveKeys[0].length')).toEqual(8);
  });

  it('fetches remote config and redacts sensitive keys within an array', async () => {
    const fetchRemoteConfigResponse = [
      {
        domain: new URL(MOCK_DATA_SERVER).hostname,
        endpoints: [
          {
            name: '/posts',
            matchingRegex: {
              regex: '/posts',
              location: 'path'
            },
            endpointConfiguration: {
              action: 'Allow',
              sensitiveKeys: [
                {
                  keyPath: 'response_body[0].title'
                }
              ]
            }
          }
        ]
      }
    ] as RemoteConfigPayloadType;
    const { postEventsMock } = mockApi({ fetchRemoteConfigResponse });
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );
    await fetch(`${MOCK_DATA_SERVER}/posts`);
    await Supergood.close();
    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted.length).toEqual(1);
  });

  it('does not intercept anything if the remote config can not be fetched', async () => {
    const fetchRemoteConfigFunction = () => {
      throw new Error('Cant fetch remote config');
    };
    const { postEventsMock } = mockApi({ fetchRemoteConfigFunction });
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );
    await fetch(`${MOCK_DATA_SERVER}/posts`);
    await Supergood.close();
    expect(postEventsMock).toHaveBeenCalledTimes(0);
  });
});
