import Supergood from '..';
import { postEvents, postError } from '../api';
import { initialize } from './json-server-config';
import { errors } from '../constants';
import {
  afterAll,
  expect,
  test,
  jest,
  describe,
  beforeAll,
  beforeEach
} from '@jest/globals';
import { ErrorPayloadType, EventRequestType } from '../types';
import initialDB from './initial-db';
import http from 'http';
import fs from 'fs';
import path from 'path';
import get from 'lodash.get';

// HTTP libraries
import superagent from 'superagent';
import axios from 'axios';
import fetch from 'node-fetch';

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
  eventSinkEndpoint: `/api/events`,
  errorSinkEndpoint: `/api/errors`,
  keysToHash: ['request.body', 'response.body'],
  ignoredDomains: []
};

let server: http.Server;

beforeAll(async () => {
  fs.writeFileSync(
    path.join(__dirname, 'db.json'),
    JSON.stringify(initialDB, null, 2),
    {
      encoding: 'utf8',
      flag: 'w'
    }
  );
  server = await initialize();
});

afterAll(async () => {
  server.close();
  fs.writeFileSync(
    path.join(__dirname, 'db.json'),
    JSON.stringify(initialDB, null, 2),
    {
      encoding: 'utf8',
      flag: 'w'
    }
  );
});

const getEvents = (mockedPostEvents: jest.Mock): Array<EventRequestType> =>
  Object.values(mockedPostEvents.mock.calls.flat()[1] as EventRequestType);

const getErrors = (mockedPostError: jest.Mock): ErrorPayloadType => {
  return Object.values(
    mockedPostError.mock.calls.flat()
  )[1] as ErrorPayloadType;
};

jest.mock('../api', () => ({
  postEvents: jest.fn(async (eventSinkUrl, data) => ({ data })),
  postError: jest.fn(async (errorSinkUrl, payload) => ({
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
    expect(postError as jest.Mock).toBeCalled();
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
    const responseJson = await response.json();
    expect(response.status).toEqual(201);
    expect(responseJson.id).toBeTruthy();
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
  });
});

describe('non-standard payloads', () => {
  test('not automatically hashing sub 500kb payload', async () => {
    // Double quotes and other strings take up space in the payload
    const payloadSize = 400000;
    await Supergood.init(
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );

    const response = await axios.get(
      `${HTTP_OUTBOUND_TEST_SERVER}/massive-response?payloadSize=${payloadSize}`
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(response.status).toEqual(200);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
    expect(
      get(eventsPosted, '[0].response.body.massiveResponse', false)
    ).toEqual('X'.repeat(payloadSize));
  });

  test('automatically hashing 500kb+ payload', async () => {
    const payloadSize = 500001;
    await Supergood.init(
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      },
      INTERNAL_SUPERGOOD_SERVER
    );
    const response = await axios.get(
      `${HTTP_OUTBOUND_TEST_SERVER}/massive-response?payloadSize=${payloadSize}`
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(response.status).toEqual(200);
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
    expect(get(eventsPosted, '[0].response.body.hashed', false)).toBeTruthy();
  });

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
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(response.status).toEqual(200);
    expect(body).toBeTruthy();
    await Supergood.close();
    const eventsPosted = getEvents(postEvents as jest.Mock);
    expect(eventsPosted.length).toEqual(1);
    expect(get(eventsPosted, '[0]response.body.gzippedResponse')).toEqual(
      'this-is-gzipped'
    );
  });
});
// Perhaps even need to write a restore from disk method?
// test('write to disk when connection fails', () => {});
