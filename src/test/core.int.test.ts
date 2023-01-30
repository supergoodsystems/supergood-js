import Supergood from '..';
import { postEvents, dumpDataToDisk } from '../api';
import http from 'http';
import jsonServer from 'json-server';
import axios from 'axios';
import path from 'path';

import { beforeEach, afterEach, expect, test, jest } from '@jest/globals';
import { SupergoodPayloadType } from '../index.d';

// TODO: Move to remote server when working on other integrations like go, python, etc.
const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

let testServer: http.Server;

// Local JSON server configuration for sending arbitrary POST/GET requests
// to a random CRUD server
const CLIENT_ID = process.env.CLIENT_ID || 'test-client-id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'test-client-secret';

const HTTP_OUTBOUND_TEST_SERVER_PORT =
  process.env.HTTP_OUTBOUND_TEST_SERVER_PORT || 3001;
const HTTP_OUTBOUND_TEST_SERVER = `http://localhost:${HTTP_OUTBOUND_TEST_SERVER_PORT}`;

const SUPERGOOD_SERVER_PORT = process.env.SUPERGOOD_SERVER_PORT || 9001;
const INTERNAL_SUPERGOOD_SERVER = `http://localhost:${SUPERGOOD_SERVER_PORT}`;

const testConfig = {
  keysToHash: ['request.body', 'response.body'],
  flushInterval: 1000,
  cacheTtl: 0,
  baseUrl: INTERNAL_SUPERGOOD_SERVER,
  eventSinkUrl: `${INTERNAL_SUPERGOOD_SERVER}/api/events`
};

const getEvents = (mockedPostEvents: jest.Mock): Array<SupergoodPayloadType> =>
  Object.values(mockedPostEvents.mock.calls.flat()[1] as SupergoodPayloadType);

jest.mock('../api', () => ({
  postEvents: jest.fn(async (data) => data),
  getOptions: jest.fn(),
  dumpDataToDisk: jest.fn((data) => data)
}));

beforeEach(async () => {
  server.use(middlewares);
  server.use(router);
  testServer = server.listen(HTTP_OUTBOUND_TEST_SERVER_PORT, () => {
    console.log(`JSON Server is running on ${HTTP_OUTBOUND_TEST_SERVER}`);
  });
});

test('captures all outgoing 200 http requests', async () => {
  const sg = Supergood(
    {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    },
    testConfig
  );

  const numberOfHttpCalls = 5;
  for (let i = 0; i < numberOfHttpCalls; i++) {
    await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
  }
  await sg.close();
  const eventsPosted = getEvents(postEvents as jest.Mock);
  expect(eventsPosted.length).toEqual(numberOfHttpCalls);
  expect(eventsPosted.every((event) => event.request.requestedAt)).toBeTruthy();
  expect(
    eventsPosted.every((event) => event.response.respondedAt)
  ).toBeTruthy();
  await sg.close();
});

test('flush cache with hanging response', async () => {
  const sg = Supergood(
    {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    },
    testConfig
  );
  axios.get('https://httpstat.us/200?sleep=2000');

  // Wait enough time for promise to kick off, not return
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await sg.close();
  const eventsPosted = getEvents(postEvents as jest.Mock);
  const firstEvent = eventsPosted[0];
  expect(eventsPosted.length).toEqual(1);
  expect(firstEvent.request.requestedAt).toBeTruthy();
  expect(firstEvent?.response?.respondedAt).toBeFalsy();
});

test('dump cache to disk when event posting fails', async () => {
  (postEvents as jest.Mock).mockImplementation(() => {
    throw new Error('Failed to post events');
  });
  const sg = Supergood(
    {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    },
    testConfig
  );
  await axios.get(`${HTTP_OUTBOUND_TEST_SERVER}/posts`);
  await sg.close();

  expect(dumpDataToDisk).toHaveBeenCalledTimes(1);
});

// Perhaps even need to write a restore from disk method?
// test('write to disk when connection fails', () => {});

afterEach(async () => testServer.close());
