import axios from 'axios';

import Supergood from '../../src';
import {
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_SERVER
} from '../consts';
import { getEvents } from '../utils/function-call-args';
import { mockApi } from '../utils/mock-api';

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
    const eventsPosted = getEvents(postEventsMock);

    expect(eventsPosted.length).toEqual(1);
    expect(eventsPosted[0].response.body).toEqual(response.data);
  });

  it('POST /posts', async () => {
    const body = {
      title: 'axios-post',
      author: 'axios-author'
    };
    const response = await axios.post(`${MOCK_DATA_SERVER}/posts`, body);
    expect(response.status).toEqual(201);
    await Supergood.close();

    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted[0].request.body).toEqual(body);
    expect(eventsPosted[0].response.body).toEqual(response.data);
    expect(eventsPosted.length).toEqual(1);
  });
});
