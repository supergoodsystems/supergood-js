import supergood from '../src';
import { postEvents } from '../src/api';
import http from 'http';
import jsonServer from 'json-server';
import axios from 'axios';
import path from 'path';

import { beforeEach, afterEach, expect, test, jest } from '@jest/globals';
import { SupergoodPayloadType } from '../src/types';

// TODO: Move to remote server when working on other integrations like go, python, etc.
const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

let testServer: http.Server;

// Local JSON server configuration for sending arbitrary POST/GET requests
// to a random CRUD server
const HTTP_TEST_SERVER_PORT = process.env.HTTP_TEST_SERVER_PORT || 3003;
const HTTP_TEST_SERVER = `http://localhost:${HTTP_TEST_SERVER_PORT}`;
const CLIENT_ID = process.env.CLIENT_ID || 'test-client-id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'test-client-secret';

const getEvents = (mockedPostEvents: jest.Mock): Array<SupergoodPayloadType> =>
  Object.values(mockedPostEvents.mock.calls.flat()[1] as SupergoodPayloadType);

jest.mock('../src/api', () => ({
  postEvents: jest.fn(async (data) => data),
  getConfig: jest.fn(async () => ({
    // Long flush interval so we can manually flush
    flushInterval: 30000,
    keysToHash: ['response.body', 'request.body'],
    cacheTtl: 0,
    eventSinkUrl: `http://localhost:${process.env.SUPERGOOD_SERVER_PORT}/api/events`
  })),
  getOptions: jest.fn(),
  dumpDataToDisk: jest.fn((data) => data)
}));

beforeEach(async () => {
  server.use(middlewares);
  server.use(router);
  testServer = server.listen(HTTP_TEST_SERVER_PORT);
});

test('captures all outgoing 200 http requests', async () => {
  const sg = await supergood({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET
  });
  const numberOfHttpCalls = 1;
  for (let i = 0; i < numberOfHttpCalls; i++) {
    // No await here, can't remember why...
    axios.get(`${HTTP_TEST_SERVER}/posts`);
  }
  sg.flushCache();
  const eventsPosted = getEvents(postEvents as jest.Mock);
  expect(eventsPosted.length).toEqual(numberOfHttpCalls);
  expect(eventsPosted.every((event) => event.request.requestedAt)).toBeTruthy();
  expect(
    eventsPosted.every((event) => event.response.respondedAt)
  ).toBeTruthy();
  sg.close();
});

// test('flush cache with hanging response', async () => {
//   const sg = await supergood({
//     clientId: process.env.CLIENT_ID || '',
//     clientSecret: process.env.CLIENT_SECRET || ''
//   });
//   await axios.get('https://httpstat.us/200?sleep=1000');

//   // Wait enough time for promise to kick off, not return
//   await new Promise((resolve) => setTimeout(resolve, 500));
//   await sg.close();
//   const eventsPosted = getEvents(postEvents as jest.Mock);
//   const firstEvent = eventsPosted[0];
//   expect(eventsPosted.length).toEqual(1);
//   expect(firstEvent.request.requestedAt).toBeTruthy();
//   expect(firstEvent.response.respondedAt).toBeFalsy();
// });

// test('flush cache when process suddenly exits', async () => {
// TODO: Got to figure out how to test this with jest
// perhaps add a force process.exit() to 'close'
// so we can test automatically?
// Really want to test nodeCleanup.
// });

// Perhaps even need to write a restore from disk method?
// test('write to disk when connection fails', () => {});

afterEach(async () => testServer.close());
