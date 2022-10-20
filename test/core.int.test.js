const supergood = require('../index');
const { postEvents } = require('../src/api');
const jsonServer = require('json-server');
const axios = require('axios');
const path = require('path');
// TODO: Move to remote server when working on other integrations like go, python, etc.
const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

let testServer;

// Local JSON server configuration for sending arbitrary POST/GET requests
// to a random CRUD server
const HTTP_TEST_SERVER_PORT = process.env.HTTP_TEST_SERVER_PORT;
const HTTP_TEST_SERVER = `http://localhost:${process.env.HTTP_TEST_SERVER_PORT}`;

const getEvents = (mockedPostEvents) =>
  mockedPostEvents.mock.calls
    .flat()
    .map((call) => Object.values(call.data))
    .flat();

jest.mock('../src/api', () => ({
  postEvents: jest.fn(async (data) => data),
  getConfig: jest.fn(async () => ({
    tokenExchangeUrl: `${process.env.SUPERGOOD_SERVER_URL}/v1/token`,
    eventPathUrl: `${process.env.SUPERGOOD_SERVER_URL}/api/events`,
    // Long flush interval so we can manually flush
    flushInterval: 30000
  })),
  getAccessToken: jest.fn(() => ({
    token_type: 'Bearer',
    expires_in: 3600,
    access_token: '1234',
    scope: 'log_events'
  })),
  dumpDataToDisk: jest.fn((data) => data)
}));

beforeEach(async () => {
  server.use(middlewares);
  server.use(router);
  testServer = server.listen(HTTP_TEST_SERVER_PORT);
});

test('captures all outgoing 200 http requests', async () => {
  const sg = await supergood.init({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  });
  const numberOfHttpCalls = 5;
  for (let i = 0; i < numberOfHttpCalls; i++) {
    await axios.get(`${HTTP_TEST_SERVER}/posts`);
  }
  sg.flushCache();
  const eventsPosted = getEvents(postEvents);
  expect(eventsPosted.length).toEqual(numberOfHttpCalls);
  expect(eventsPosted.every((event) => event.requestedAt)).toBeTruthy();
  expect(eventsPosted.every((event) => event.respondedAt)).toBeTruthy();
  sg.close();
});

test('flush cache with hanging response', async () => {
  const sg = await supergood.init({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  });
  axios.get('https://httpstat.us/200?sleep=1000').then(() => {});

  // Wait enough time for promise to kick off, not return
  await new Promise((resolve) => setTimeout(resolve, 500));
  sg.close({ force: true });
  const eventsPosted = getEvents(postEvents);
  expect(eventsPosted.length).toEqual(1);
  expect(eventsPosted[0].requestedAt).toBeTruthy();
  expect(eventsPosted[0].respondedAt).toBeFalsy();
});

test('flush cache when process suddenly exits', async () => {
  // TODO: Got to figure out how to test this with jest
  // perhaps add a force process.exit() to 'close'
  // so we can test automatically?
  // Really want to test nodeCleanup.
});

// Perhaps even need to write a restore from disk method?
test('write to disk when connection fails', () => {});

afterEach(async () => testServer.close());
