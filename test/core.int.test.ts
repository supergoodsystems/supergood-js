import http from 'http';
import fs from 'fs';
import path from 'path';
import get from 'lodash.get';

// HTTP libraries
import { request } from 'undici';
import superagent from 'superagent';
import axios from 'axios';
import fetch from 'node-fetch';

import Supergood from '../src';
import { postEvents, postError } from '../src/api';
import { initialize } from './json-server-config';
import { errors } from '../src/constants';
import { ErrorPayloadType, EventRequestType } from '../src/types';
import initialDB from './initial-db';

import { sleep } from '../src/utils';

const base64Regex =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

// Local JSON server configuration for sending arbitrary POST/GET requests
// to a random CRUD server
const CLIENT_ID = 'test-client-id';
const CLIENT_SECRET = 'test-client-secret';
const HTTP_OUTBOUND_TEST_SERVER_PORT = 3001;
const HTTP_OUTBOUND_TEST_SERVER = `http://localhost:${HTTP_OUTBOUND_TEST_SERVER_PORT}`;

const SUPERGOOD_SERVER_PORT = 9001;
const INTERNAL_SUPERGOOD_SERVER = `http://localhost:${SUPERGOOD_SERVER_PORT}`;

const defaultConfig = {
  flushInterval: 30000,
  cacheTtl: 0,
  eventSinkEndpoint: `/events`,
  errorSinkEndpoint: `/errors`,
  keysToHash: ['request.body', 'response.body'],
  ignoredDomains: []
};

let server: http.Server;

const getEvents = (mockedPostEvents: jest.Mock): Array<EventRequestType> => {
  return Object.values(
    mockedPostEvents.mock.calls.flat()[1] as EventRequestType
  );
};

const getErrors = (mockedPostError: jest.Mock): ErrorPayloadType => {
  return Object.values(
    mockedPostError.mock.calls.flat()
  )[1] as ErrorPayloadType;
};

const resetDatabase = () => {
  fs.writeFileSync(
    path.join(__dirname, 'db.json'),
    JSON.stringify(initialDB, null, 2),
    {
      encoding: 'utf8',
      flag: 'w'
    }
  );
};

beforeAll(async () => {
  resetDatabase();
  server = await initialize();
});

afterAll(async () => {
  server.close();
  resetDatabase();
});

jest.mock('../src/api', () => ({
  postEvents: jest.fn(async (_, data) => ({ data })),
  postError: jest.fn(async (_, payload) => ({
    payload
  }))
}));

describe('testing success states', () => {
  test('captures all outgoing 200 http requests', async () => {
    await Supergood.init(
      {
        config: defaultConfig,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );

    const numberOfHttpCalls = 5;
    for (let i = 0; i < numberOfHttpCalls; i++) {
      await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    }
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(numberOfHttpCalls);
    expect(
      eventsPosted.every((event) => event.request.requestedAt)
    ).toBeTruthy();
    expect(
      eventsPosted.every((event) => event.response.respondedAt)
    ).toBeTruthy();
    await Supergood.close();
  });

  test('captures non-success status and errors', async () => {
    const httpErrorCodes = [400, 401, 403, 404, 500, 501, 502, 503, 504];
    await Supergood.init(
      {
        config: defaultConfig,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    for (let i = 0; i < httpErrorCodes.length; i++) {
      try {
        await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/${httpErrorCodes[i]}`);
      } catch (e) {
        // ignore
      }
    }
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(httpErrorCodes.length);
    expect(
      eventsPosted.every((event) =>
        httpErrorCodes.includes(event.response.status)
      )
    ).toBeTruthy();
  });
});

describe('testing failure states', () => {
  test('hanging response', async () => {
    await Supergood.init(
      {
        config: defaultConfig,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/200?sleep=2000`);
    await sleep(1000);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    const firstEvent = eventsPosted[0];
    expect(eventsPosted.length).toEqual(1);
    expect(firstEvent.request.requestedAt).toBeTruthy();
    expect(firstEvent?.response?.respondedAt).toBeFalsy();
  });

  // Causes the github actions to hang for some reason
  test.skip('posting errors', async () => {
    (postEvents as jest.Mock).mockImplementation(() => {
      throw new Error();
    });
    await Supergood.init(
      {
        config: defaultConfig,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    await Supergood.close();
    const postedErrors = getErrors(postError as jest.Mock);
    expect(postError as jest.Mock).toHaveBeenCalled();
    expect(postedErrors.message).toEqual(errors.POSTING_EVENTS);
  });
});

describe('config specifications', () => {
  test('hashing', async () => {
    await Supergood.init(
      {
        config: {
          keysToHash: ['response.body']
        },
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    const firstEvent = eventsPosted[0] as EventRequestType;
    const hashedBodyValue = get(firstEvent, ['response', 'body', '0']);
    expect(hashedBodyValue && hashedBodyValue.match(base64Regex)).toBeTruthy();
  });

  test('not hashing', async () => {
    await Supergood.init(
      {
        config: { keysToHash: [] },
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    const firstEvent = eventsPosted[0] as EventRequestType;
    expect(
      typeof get(firstEvent, ['response', 'body']) === 'object'
    ).toBeTruthy();
    expect(get(firstEvent, ['response', 'body', 'hashed'])).toBeFalsy();
  });

  test('keys to hash not in config', async () => {
    await Supergood.init(
      {
        config: {
          keysToHash: ['thisKeyDoesNotExist', 'response.thisKeyDoesNotExist']
        },
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    const firstEvent = eventsPosted[0] as EventRequestType;
    expect(
      typeof get(firstEvent, ['response', 'body']) === 'object'
    ).toBeTruthy();
    expect(get(firstEvent, ['response', 'body', 'hashed'])).toBeFalsy();
  });

  test('ignores requests to ignored domains', async () => {
    await Supergood.init(
      {
        config: { ignoredDomains: ['supergood-testbed.herokuapp.com'] },
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get('https://supergood-testbed.herokuapp.com/200');
    await Supergood.close();
    expect(postEvents).toBeCalledTimes(0);
  });

  test('operates normally when ignored domains is empty', async () => {
    await Supergood.init(
      {
        config: { ignoredDomains: [] },
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get('https://supergood-testbed.herokuapp.com/200');
    await Supergood.close();
    expect(postEvents).toBeCalledTimes(1);
  });

  test('performances matching on partial domains', async () => {
    await Supergood.init(
      {
        config: { ignoredDomains: ['herokuapp.com'] },
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get('https://supergood-testbed.herokuapp.com/200');
    await Supergood.close();
    expect(postEvents).toBeCalledTimes(0);
  });

  test('performances matching on partial domains, allowed overrides ignored', async () => {
    await Supergood.init(
      {
        config: {
          allowedDomains: ['herokuapp.com'],
          ignoredDomains: ['herokuapp.com']
        },
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get('https://supergood-testbed.herokuapp.com/200');
    await Supergood.close();
    expect(postEvents).toBeCalledTimes(1);
  });

  test('only posts for specified domains, ignores everything else', async () => {
    await Supergood.init(
      {
        config: {
          allowedDomains: ['ipify']
        },
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get('https://api.ipify.org?format=json');
    await axios.get('https://supergood-testbed.herokuapp.com/200');
    await Supergood.close();
    expect(postEvents).toBeCalledTimes(1);
  });
});

describe('testing various endpoints and libraries basic functionality', () => {
  beforeEach(async () => {
    await Supergood.init(
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
  });

  test('axios get', async () => {
    const response = await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    expect(response.status).toEqual(200);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
  });

  test('axios post', async () => {
    const response = await axios.post(`${HTTP_OUTBOUND_TEST_SERVER}/posts`, {
      title: 'axios-post',
      author: 'alex-klarfeld'
    });
    expect(response.status).toEqual(201);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
  });

  test('superagent get', async () => {
    const response = await superagent.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    expect(response.status).toEqual(200);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
  });

  test('superagent post', async () => {
    const response = await superagent
      .post(`${HTTP_OUTBOUND_TEST_SERVER}/posts`)
      .send({
        title: 'superagent-post',
        author: 'alex-klarfeld'
      });
    expect(response.status).toEqual(201);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
  });

  test('node-fetch get', async () => {
    const response = await fetch(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    const body = await response.text();
    expect(response.status).toEqual(200);
    expect(body).toBeTruthy();
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
  });

  test('node-fetch post', async () => {
    const response = await fetch(`${HTTP_OUTBOUND_TEST_SERVER}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'node-fetch-post'
      })
    });
    const responseJson = (await response.json()) as Response & { id: string };
    expect(response.status).toEqual(201);
    expect(responseJson.id).toBeTruthy();
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
  });

  // Not yet supported
  xtest('undici get', async () => {
    const response = await request(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    expect(response.statusCode).toEqual(200);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
  });

  // Not yet supported
  xtest('undici post', async () => {
    const response = await request(`${HTTP_OUTBOUND_TEST_SERVER}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'undici-post'
      })
    });
    expect(response.statusCode).toEqual(201);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
  });
});

describe('non-standard payloads', () => {
  test('gzipped response', async () => {
    await Supergood.init(
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    const response = await fetch(
      `${HTTP_OUTBOUND_TEST_SERVER}/gzipped-response`
    );
    const body = await response.text();
    await sleep(2000);
    expect(response.status).toEqual(200);
    expect(body).toBeTruthy();
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
    expect(get(eventsPosted, '[0]response.body')).toEqual({
      gzippedResponse: 'this-is-gzipped'
    });
  });
});

describe('captures headers', () => {
  test('captures request headers', async () => {
    await Supergood.init(
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await fetch(`${HTTP_OUTBOUND_TEST_SERVER}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'node-fetch-post'
      }),
      headers: {
        'x-custom-header': 'custom-header-value'
      }
    });
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
    expect(get(eventsPosted, '[0]request.headers.x-custom-header')).toEqual(
      'custom-header-value'
    );
  });

  test('capture response headers', async () => {
    await Supergood.init(
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await fetch(`${HTTP_OUTBOUND_TEST_SERVER}/custom-header`);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
    expect(get(eventsPosted, '[0]response.headers.x-custom-header')).toEqual(
      'custom-header-value'
    );
  });
});

describe('local client id and secret', () => {
  test('does not report out', async () => {
    await Supergood.init(
      {
        config: defaultConfig,
        clientId: 'local-client-id',
        clientSecret: 'local-client-secret'
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
    expect(postEvents).toBeCalledTimes(0);
    await Supergood.close();
  });
});

// node 14 fails due to AbortController not being supported
// need to figure out why it is not get caught by the agent
describe.skip('testing openAI', () => {
  test('simple chat completion call being logged', async () => {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const OpenAI = require('openai');
    await Supergood.init(
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
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
    const eventsPosted = getEvents(postEvents as jest.Mock)[0];
    const content = (get(
      eventsPosted,
      'response.body.choices[0].message.content'
    ) || '') as string;
    expect(content.length).toBeGreaterThan(1);
  });
});
