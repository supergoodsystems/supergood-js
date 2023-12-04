import { request } from 'undici';

import Supergood from '../../src';
import {
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_SERVER
} from '../consts';
import { getEvents } from '../utils/function-call-args';
import { mockApi } from '../utils/mock-api';

// TODO: post events mock is not being called
describe.skip('undici library', () => {
  const { postEventsMock } = mockApi();

  beforeEach(async () => {
    await Supergood.init(
      {
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );
  });

  it('GET /posts ', async () => {
    const response = await request(`${MOCK_DATA_SERVER}/posts`);
    const responseBody = await response.body.json();
    expect(response.statusCode).toEqual(200);
    await Supergood.close();

    expect(postEventsMock).toHaveBeenCalled();
    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted.length).toEqual(1);
    expect(eventsPosted[0].response.body).toEqual(responseBody);
  });

  it('POST /posts', async () => {
    const body = {
      title: 'axios-post',
      author: 'axios-author'
    };
    const response = await request(`${MOCK_DATA_SERVER}/posts`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const responseBody = await response.body.json();
    expect(response.statusCode).toEqual(201);
    await Supergood.close();

    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted[0].request.body).toEqual(body);
    expect(eventsPosted[0].response.body).toEqual(responseBody);
    expect(eventsPosted.length).toEqual(1);
  });
});
