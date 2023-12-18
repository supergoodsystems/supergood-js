import axios from 'axios';

import Supergood from '../../src';
import {
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_SERVER
} from '../consts';
import { mockApi } from '../utils/mock-api';
import { checkPostedEvents } from '../utils/function-call-args';

describe('axios library', () => {
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

  it('GET /posts ', async () => {
    const response = await axios.get(`${MOCK_DATA_SERVER}/posts`);
    expect(response.status).toEqual(200);
    await Supergood.close();

    checkPostedEvents(postEventsMock, 1, {
      response: expect.objectContaining({
        body: response.data
      })
    });
  });

  it('POST /posts', async () => {
    const body = {
      title: 'axios-post',
      author: 'axios-author'
    };
    const response = await axios.post(`${MOCK_DATA_SERVER}/posts`, body);
    expect(response.status).toEqual(201);
    await Supergood.close();

    checkPostedEvents(postEventsMock, 1, {
      response: expect.objectContaining({
        body: response.data
      }),
      request: expect.objectContaining({ body })
    });
  });
});
