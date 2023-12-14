import axios from 'axios';
import fetch from 'node-fetch';

import Supergood from '../../src';
import { LocalClientId, LocalClientSecret, errors } from '../../src/constants';

import { sleep } from '../../src/utils';
import {
  BASE64_REGEX,
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_CONFIG,
  SUPERGOOD_SERVER
} from '../consts';
import { mockApi } from '../utils/mock-api';
import { checkPostedEvents } from '../utils/function-call-args';

describe('core functionality', () => {
  const { postEventsMock, postErrorMock } = mockApi();

  describe('success states', () => {
    it('should capture all outgoing 200 http requests', async () => {
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

      checkPostedEvents(postEventsMock, numberOfHttpCalls, {
        request: expect.objectContaining({
          requestedAt: expect.any(Date)
        }),
        response: expect.objectContaining({
          respondedAt: expect.any(Date)
        })
      });
    });

    it('should capture non-success statuses and errors', async () => {
      const HTTP_ERROR_CODES = [400, 401, 403, 404, 500, 501, 502, 503, 504];
      await Supergood.init(
        {
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      for (const code of HTTP_ERROR_CODES) {
        try {
          await axios.get(`${MOCK_DATA_SERVER}/${code}`);
        } catch (e) {
          // ignore
        }
      }
      await Supergood.close();

      checkPostedEvents(postEventsMock, HTTP_ERROR_CODES.length, {
        response: expect.objectContaining({
          status: expect.toBeOneOf(HTTP_ERROR_CODES)
        })
      });
    });
  });

  describe('failure states', () => {
    it('hanging response', async () => {
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

      checkPostedEvents(postEventsMock, 1, {
        request: expect.objectContaining({
          requestedAt: expect.any(Date)
        })
      });
    }, 10000);

    it('posting errors', async () => {
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
      expect(postErrorMock).toHaveBeenCalled();
      expect(postErrorMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: errors.POSTING_EVENTS
        }),
        expect.any(Object)
      );
    });
  });

  describe('config specifications', () => {
    it('should hash keys provided in config', async () => {
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

      checkPostedEvents(postEventsMock, 1, {
        response: expect.objectContaining({
          body: expect.arrayContaining([expect.stringMatching(BASE64_REGEX)])
        })
      });
    });

    it('should not hash anything', async () => {
      await Supergood.init(
        {
          config: { keysToHash: [], allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET
        },
        SUPERGOOD_SERVER
      );
      const response = await axios.get(`${MOCK_DATA_SERVER}/posts`);
      await Supergood.close();

      checkPostedEvents(postEventsMock, 1, {
        response: expect.objectContaining({
          body: response.data
        })
      });
    });

    it('should not hash if provided keys do not exist', async () => {
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
      const response = await axios.get(`${MOCK_DATA_SERVER}/posts`);
      await Supergood.close();

      checkPostedEvents(postEventsMock, 1, {
        response: expect.objectContaining({
          body: response.data
        })
      });
    });

    it('should ignore requests to ignored domains', async () => {
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

    it('should operate normally when ignored domains is empty', async () => {
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

    it('should only post events for specified domains and ignore everything else', async () => {
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
      const allowedUrl = new URL('https://api.ipify.org?format=json');
      await axios.get(allowedUrl.toString());
      await axios.get('https://supergood-testbed.herokuapp.com/200');
      await Supergood.close();

      checkPostedEvents(postEventsMock, 1, {
        request: expect.objectContaining({
          url: allowedUrl.toString()
        })
      });
    });
  });

  describe('encoding', () => {
    it('should handle gzipped response', async () => {
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
      const responseBody = await response.json();
      await Supergood.close();

      expect(postEventsMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            response: expect.objectContaining({
              body: responseBody
            })
          })
        ]),
        expect.any(Object)
      );
    });
  });

  describe('headers', () => {
    it('should capture custom request headers', async () => {
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

      expect(postEventsMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            request: expect.objectContaining({
              headers: expect.objectContaining({
                'x-custom-header': 'custom-header-value'
              })
            })
          })
        ]),
        expect.any(Object)
      );
    });

    it('should capture custom response headers', async () => {
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
      expect(postEventsMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            response: expect.objectContaining({
              headers: expect.objectContaining({
                'x-custom-header': 'custom-header-value'
              })
            })
          })
        ]),
        expect.any(Object)
      );
    });
  });

  describe('local client id and secret', () => {
    it('should not report out', async () => {
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
