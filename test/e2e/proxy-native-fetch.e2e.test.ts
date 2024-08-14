import Supergood from '../../src';
import {
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_CONFIG,
  SUPERGOOD_SERVER
} from '../consts';
import { RemoteConfigPayloadTypeV2 } from '../../src/types';
import { getEvents } from '../utils/function-call-args';
import { mockApi } from '../utils/mock-api';

describe('proxy native fetch functionality', () => {
  beforeAll(() => {
    process.env.SUPERGOOD_PROXY_BASE_URL = MOCK_DATA_SERVER;
  });
  it('fetches the remote config and injects the proxy credentials for the domain for native-fetch api', async () => {
    const fetchRemoteConfigResponse = {
      proxyConfig: {
        vendorCredentialConfig: {
          ['api.openai.com']: { enabled: true }
        }
      },
      endpointConfig: []
    } as RemoteConfigPayloadTypeV2;
    const { postEventsMock } = mockApi({ fetchRemoteConfigResponse });
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );
    // NOTE: currently implementation does not update the protocol
    // between upstream and proxy
    // TODO: support protocol differences between upstream + proxy
    await fetch(`http://api.openai.com/custom-header`);
    await Supergood.close();
    expect(getEvents(postEventsMock).length).toEqual(1);
    expect(getEvents(postEventsMock)[0].request.url).toEqual(
      'http://api.openai.com/custom-header'
    );
    expect(getEvents(postEventsMock)[0].response.status).toEqual(200);
    expect(
      getEvents(postEventsMock)[0].response.headers['x-custom-header']
    ).toEqual('custom-header-value');
  });
});
