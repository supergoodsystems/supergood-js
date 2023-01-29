"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const json_server_1 = __importDefault(require("json-server"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const globals_1 = require("@jest/globals");
// TODO: Move to remote server when working on other integrations like go, python, etc.
const server = json_server_1.default.create();
const router = json_server_1.default.router(path_1.default.join(__dirname, 'db.json'));
const middlewares = json_server_1.default.defaults();
let testServer;
// Local JSON server configuration for sending arbitrary POST/GET requests
// to a random CRUD server
const CLIENT_ID = process.env.CLIENT_ID || 'test-client-id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'test-client-secret';
const HTTP_TEST_SERVER_PORT = process.env.HTTP_TEST_SERVER_PORT || 3003;
const HTTP_TEST_SERVER = `http://localhost:${HTTP_TEST_SERVER_PORT}`;
const getEvents = (mockedPostEvents) => Object.values(mockedPostEvents.mock.calls.flat()[1]);
globals_1.jest.mock('../src/api', () => ({
    postEvents: globals_1.jest.fn((data) => __awaiter(void 0, void 0, void 0, function* () { return data; })),
    getConfig: globals_1.jest.fn(() => __awaiter(void 0, void 0, void 0, function* () {
        return ({
            // Long flush interval so we can manually flush
            flushInterval: 30000,
            keysToHash: ['response.body', 'request.body'],
            cacheTtl: 0,
            eventSinkUrl: `http://localhost:${process.env.SUPERGOOD_SERVER_PORT}/api/events`
        });
    })),
    getOptions: globals_1.jest.fn(),
    dumpDataToDisk: globals_1.jest.fn((data) => data)
}));
(0, globals_1.beforeEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    server.use(middlewares);
    server.use(router);
    testServer = server.listen(HTTP_TEST_SERVER_PORT);
}));
(0, globals_1.test)('captures all outgoing 200 http requests', () => __awaiter(void 0, void 0, void 0, function* () {
    // const sg = await supergood({
    //   clientId: CLIENT_ID,
    //   clientSecret: CLIENT_SECRET
    // });
    const numberOfHttpCalls = 1;
    for (let i = 0; i < numberOfHttpCalls; i++) {
        // No await here, can't remember why...
        axios_1.default.get(`${HTTP_TEST_SERVER}/posts`);
    }
    // sg.flushCache();
    // const eventsPosted = getEvents(postEvents as jest.Mock);
    // expect(eventsPosted.length).toEqual(numberOfHttpCalls);
    // expect(eventsPosted.every((event) => event.request.requestedAt)).toBeTruthy();
    // expect(
    //   eventsPosted.every((event) => event.response.respondedAt)
    // ).toBeTruthy();
    // sg.close();
}));
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
(0, globals_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () { return testServer.close(); }));
