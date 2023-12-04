import get from 'lodash.get';

import Supergood from '../../src';
import {
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_SERVER
} from '../consts';
import { getEvents } from '../utils/function-call-args';
import { mockApi } from '../utils/mock-api';

// node 14 fails due to AbortController not being supported
// need to figure out why it is not get caught by the agent
describe.skip('openai library', () => {
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

  it('simple chat completion call being logged ', async () => {
    const OpenAI = require('openai-api');
    const openAi = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await openAi.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: 'Come up with a name for a new fintech company'
        }
      ],
      model: 'gpt-3.5-turbo-0613'
    });
    await Supergood.close();
    const eventsPosted = getEvents(postEventsMock)[0];
    const content = (get(
      eventsPosted,
      'response.body.choices[0].message.content'
    ) || '') as string;
    expect(content.length).toBeGreaterThan(1);
  });
});
