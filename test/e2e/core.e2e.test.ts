import get from 'lodash.get';

import axios from 'axios';
import fetch from 'node-fetch';

import Supergood from '../../src';
import { LocalClientId, LocalClientSecret, errors } from '../../src/constants';
import { EventRequestType } from '../../src/types';

import { sleep } from '../../src/utils';
import {
  BASE64_REGEX,
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_CONFIG,
  SUPERGOOD_SERVER
} from '../consts';
import { getErrors, getEvents } from '../utils/function-call-args';
import { mockApi } from '../utils/mock-api';

describe('core functionality', () => {
  const { postEventsMock, postErrorMock } = mockApi();

  describe('testing success states', () => {
    test('captures all outgoing 200 http requests', async () => {
      await Supergood.init(
        {
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );

      const numberOfHttpCalls = 5;
      for (let i = 0; i < numberOfHttpCalls; i++) {
        await axios.get(`${MOCK_DATA_SERVER}/posts`);
      }
      await Supergood.close();
      // checking that all events were posted
      expect(postEventsMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.toBeArrayOfSize(numberOfHttpCalls),
        expect.any(Object)
      );
      expect(postEventsMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            request: expect.objectContaining({
              requestedAt: expect.any(Date)
            }),
            response: expect.objectContaining({
              respondedAt: expect.any(Date)
            })
          })
        ]),
        expect.any(Object)
      );
    });

    test('captures non-success status and errors', async () => {
      const httpErrorCodes = [400, 401, 403, 404, 500, 501, 502, 503, 504];
      await Supergood.init(
        {
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      for (const code of httpErrorCodes) {
        try {
          await axios.get(`${MOCK_DATA_SERVER}/${code}`);
        } catch (e) {
          // ignore
        }
      }
      await Supergood.close();

      // checking that all events were posted
      expect(postEventsMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.toBeArrayOfSize(httpErrorCodes.length),
        expect.any(Object)
      );
      expect(postEventsMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            response: expect.objectContaining({
              status: expect.toBeOneOf(httpErrorCodes)
            })
          })
        ]),
        expect.any(Object)
      );
    });
  });

  describe('testing failure states', () => {
    test('hanging response', async () => {
      await Supergood.init(
        {
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      axios.get(`${MOCK_DATA_SERVER}/200?sleep=2000`);
      await sleep(1000);
      await Supergood.close();

      // checking that all events were posted
      expect(postEventsMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.toBeArrayOfSize(1),
        expect.any(Object)
      );
      expect(postEventsMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            request: expect.objectContaining({
              requestedAt: expect.any(Date)
            })
          })
        ]),
        expect.any(Object)
      );
    }, 10000);

    // Causes the github actions to hang for some reason
    test('posting errors', async () => {
      postEventsMock.mockImplementationOnce(() => {
        throw new Error();
      });
      await Supergood.init(
        {
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      await axios.get(`${MOCK_DATA_SERVER}/posts`);
      await Supergood.close();
      const postedErrors = getErrors(postErrorMock);
      expect(postErrorMock).toHaveBeenCalled();
      expect(postedErrors.message).toEqual(errors.POSTING_EVENTS);
    });
  });

  xdescribe('config specifications', () => {
    test('hashing', async () => {
      await Supergood.init(
        {
          config: {
            keysToHash: ['response.body'],
            allowLocalUrls: true
          },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      await axios.get(`${MOCK_DATA_SERVER}/posts`);
      await Supergood.close();
      const eventsPosted = getEvents(postEventsMock);
      const firstEvent = eventsPosted[0] as EventRequestType;
      const hashedBodyValue = get(firstEvent, ['response', 'body', '0']);
      expect(
        hashedBodyValue && hashedBodyValue.match(BASE64_REGEX)
      ).toBeTruthy();
    });

    test('not hashing', async () => {
      await Supergood.init(
        {
          config: { keysToHash: [], allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      await axios.get(`${MOCK_DATA_SERVER}/posts`);
      await Supergood.close();
      const eventsPosted = getEvents(postEventsMock);
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
            keysToHash: ['thisKeyDoesNotExist', 'response.thisKeyDoesNotExist'],
            allowLocalUrls: true
          },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      await axios.get(`${MOCK_DATA_SERVER}/posts`);
      await Supergood.close();
      const eventsPosted = getEvents(postEventsMock);
      const firstEvent = eventsPosted[0] as EventRequestType;
      expect(
        typeof get(firstEvent, ['response', 'body']) === 'object'
      ).toBeTruthy();
      expect(get(firstEvent, ['response', 'body', 'hashed'])).toBeFalsy();
    });

    test('ignores requests to ignored domains', async () => {
      await Supergood.init(
        {
          config: {
            ignoredDomains: ['supergood-testbed.herokuapp.com'],
            allowLocalUrls: true
          },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      await axios.get('https://supergood-testbed.herokuapp.com/200');
      await Supergood.close();
      expect(postEventsMock).not.toHaveBeenCalled();
    });

    test('operates normally when ignored domains is empty', async () => {
      await Supergood.init(
        {
          config: { ignoredDomains: [], allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      await axios.get('https://supergood-testbed.herokuapp.com/200');
      await Supergood.close();
      expect(postEventsMock).toHaveBeenCalled();
    });

    test('only posts for specified domains, ignores everything else', async () => {
      await Supergood.init(
        {
          config: {
            ignoredDomains: ['supergood-testbed.herokuapp.com'],
            allowLocalUrls: true
          },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      await axios.get('https://api.ipify.org?format=json');
      await axios.get('https://supergood-testbed.herokuapp.com/200');
      await Supergood.close();
      expect(postEventsMock).toHaveBeenCalled();
    });
  });

  describe('non-standard payloads', () => {
    test('gzipped response', async () => {
      await Supergood.init(
        {
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET,
          config: {
            allowLocalUrls: true
          }
        },
        SUPERGOOD_SERVER
      );
      const response = await fetch(`${MOCK_DATA_SERVER}/gzipped-response`);
      const body = await response.text();
      await sleep(2000);
      expect(response.status).toEqual(200);
      expect(body).toBeTruthy();
      await Supergood.close();
      const eventsPosted = getEvents(postEventsMock);
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
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET,
          config: {
            allowLocalUrls: true
          }
        },
        SUPERGOOD_SERVER
      );
      await fetch(`${MOCK_DATA_SERVER}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'node-fetch-post'
        }),
        headers: {
          'x-custom-header': 'custom-header-value'
        }
      });
      await Supergood.close();
      const eventsPosted = getEvents(postEventsMock);
      expect(eventsPosted.length).toEqual(1);
      expect(get(eventsPosted, '[0]request.headers.x-custom-header')).toEqual(
        'custom-header-value'
      );
    });

    test('capture response headers', async () => {
      await Supergood.init(
        {
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET,
          config: { allowLocalUrls: true }
        },
        SUPERGOOD_SERVER
      );
      await fetch(`${MOCK_DATA_SERVER}/custom-header`);
      await Supergood.close();
      const eventsPosted = getEvents(postEventsMock);
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
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: LocalClientId,
          clientSecret: LocalClientSecret
        },
        SUPERGOOD_SERVER
      );
      await axios.get(`${MOCK_DATA_SERVER}/posts`);
      await Supergood.close();
      expect(postEventsMock).not.toHaveBeenCalled();
    });
  });
});
