import { Issuer } from 'openid-client';

import Supergood from '../../src';
import {
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_SERVER
} from '../consts';
import { mockApi } from '../utils/mock-api';
import { getEvents } from '../utils/function-call-args';

describe('openid client library', () => {
  const { postEventsMock } = mockApi();

  beforeEach(async () => {
    await Supergood.init(
      {
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET,
        config: {
          allowLocalUrls: true
        }
      },
      SUPERGOOD_SERVER
    );
  });

  it('GET /accounts.google.com', async () => {
    const googleIssuer = await Issuer.discover('https://accounts.google.com');
    await Supergood.close();

    const events = getEvents(postEventsMock);
    // checking vice versa because googleIssuer adds additional properties to metadata
    expect(googleIssuer.metadata).toEqual(
      expect.objectContaining(events[0].response.body)
    );
  }, 10000);
});
