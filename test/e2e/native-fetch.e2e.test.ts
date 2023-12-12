import Supergood from '../../src';
import {
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_SERVER
} from '../consts';
import { getEvents } from '../utils/function-call-args';
import { mockApi } from '../utils/mock-api';

const [major] = process.versions.node.split('.').map(Number);
const describeIf = major >= 18 ? describe : describe.skip;

describeIf('native fetch', () => {
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
    const response = await fetch(`${MOCK_DATA_SERVER}/posts`);
    const responseBody = await response.json();
    expect(response.status).toEqual(200);
    await Supergood.close();

    const eventsPosted = getEvents(postEventsMock);

    expect(eventsPosted.length).toEqual(1);
    expect(eventsPosted[0].response.body).toEqual(responseBody);
  });

  it('POST /posts', async () => {
    const body = {
      title: 'node-fetch-post',
      author: 'node-fetch-author'
    };
    const response = await fetch(`${MOCK_DATA_SERVER}/posts`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const responseBody = await response.json();
    expect(response.status).toEqual(201);
    await Supergood.close();

    const eventsPosted = getEvents(postEventsMock);

    expect(eventsPosted[0].request.body).toEqual(body);
    expect(eventsPosted[0].response.body).toEqual(responseBody);
    expect(eventsPosted.length).toEqual(1);
  });
});
