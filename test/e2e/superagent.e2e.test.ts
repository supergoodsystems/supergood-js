import superagent from 'superagent';

import Supergood from '../../src';
import {
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_SERVER
} from '../consts';
import { getEvents } from '../utils/function-call-args';
import { mockApi } from '../utils/mock-api';

describe('superagent library', () => {
  const { postEventsMock } = mockApi();

  beforeEach(async () => {
    await Supergood.init(
      {
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET,
        config: { allowLocalUrls: true }
      },
      SUPERGOOD_SERVER
    );
  });

  it('GET /posts ', async () => {
    const response = await superagent.get(`${MOCK_DATA_SERVER}/posts`);
    expect(response.status).toEqual(200);
    await Supergood.close();
    const eventsPosted = getEvents(postEventsMock);

    expect(eventsPosted.length).toEqual(1);
    expect(eventsPosted[0].response.body).toEqual(response.body);
  });

  it('POST /posts', async () => {
    const body = {
      title: 'superagent-post',
      author: 'superagent-author'
    };
    const response = await superagent
      .post(`${MOCK_DATA_SERVER}/posts`)
      .send(body);
    expect(response.status).toEqual(201);
    await Supergood.close();

    const eventsPosted = getEvents(postEventsMock);

    // TODO: for some reason, the request body is empty
    // expect(eventsPosted[0].request.body).toEqual(body);
    expect(eventsPosted[0].response.body).toEqual(response.body);
    expect(eventsPosted.length).toEqual(1);
  });
});
