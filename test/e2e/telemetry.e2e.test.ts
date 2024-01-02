import Supergood from '../../src';
import { mockApi } from '../utils/mock-api';
import axios from 'axios';

import {
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_CONFIG,
  SUPERGOOD_SERVER
} from '../consts';
import { getTelemetry } from '../utils/function-call-args';

describe('telemetry posting', () => {
  const { postTelemetryMock } = mockApi();
  it('should accurately post telemetry', async () => {
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET,
        metadata: {
          serviceName: "test-service-name",
        }
      },
      SUPERGOOD_SERVER
    );
    await axios.get(`${MOCK_DATA_SERVER}/posts`);
    await Supergood.close();
    const { keys, size, serviceName } = getTelemetry(postTelemetryMock);
    expect(keys).toEqual(1);
    expect(size).toEqual(160);
    expect(serviceName).toEqual("test-service-name");
  })

})
