import fetch from 'node-fetch';
import { get } from 'lodash';

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

describe('Custom tags', () => {
  it('should add custom tags to events', async () => {
    // Add your test code here
    const { postEventsMock } = mockApi();
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET,
        tags: {
          customTag: 'customValue'
        }
      },
      SUPERGOOD_SERVER
    );
    await fetch(`${MOCK_DATA_SERVER}/profile`);
    await Supergood.close();
    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted.length).toEqual(1);
    expect(get(eventsPosted[0], 'metadata.tags.customTag')).toEqual('customValue');
  });
})
