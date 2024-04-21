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

describe('capture functionality', () => {
  const { postEventsMock, postErrorMock } = mockApi();

  describe('withCapture success states', () => {
    it('should ONLY capture all outgoing 200 http requests wrapped in withCapture', async () => {
      const numberOfHttpCalls = 5;
      await axios.get(`${MOCK_DATA_SERVER}/posts`);
      await Supergood.withCapture(
        {
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET,
          baseUrl: SUPERGOOD_SERVER
        },
      async () => {
        for (let i = 0; i < numberOfHttpCalls; i++) {
          await axios.get(`${MOCK_DATA_SERVER}/posts`);
        }
      })
      await axios.get(`${MOCK_DATA_SERVER}/posts`);
      checkPostedEvents(postEventsMock, numberOfHttpCalls, {
        request: expect.objectContaining({
          requestedAt: expect.any(Date)
        }),
        response: expect.objectContaining({
          respondedAt: expect.any(Date)
        })
      });
    });

    it('should ONLY capture all outgoing 200 http requests wrapped in withCapture, despite other threads also being logged', async () => {
      const numberOfHttpCalls = 5;

      const getInterval = setInterval(async () => {
        await axios.get(`${MOCK_DATA_SERVER}/posts`), 250
      });

      await Supergood.withCapture(
        {
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET,
          baseUrl: SUPERGOOD_SERVER
        },
      async () => {
        for (let i = 0; i < numberOfHttpCalls; i++) {
          await axios.get(`${MOCK_DATA_SERVER}/posts`);
        }
      })

      getInterval.unref();

      checkPostedEvents(postEventsMock, numberOfHttpCalls, {
        request: expect.objectContaining({
          requestedAt: expect.any(Date)
        }),
        response: expect.objectContaining({
          respondedAt: expect.any(Date)
        })
      });
    });
  });

  describe('startCapture success states', () => {
    it('should ONLY capture all outgoing 200 http requests after startCapture and before stopCapture', async () => {
      const numberOfHttpCalls = 5;
      await axios.get(`${MOCK_DATA_SERVER}/posts`);

      await Supergood.startCapture(
        {
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET,
          baseUrl: SUPERGOOD_SERVER
        });

      for (let i = 0; i < numberOfHttpCalls; i++) {
        await axios.get(`${MOCK_DATA_SERVER}/posts`);
      }

      await Supergood.stopCapture();
      await axios.get(`${MOCK_DATA_SERVER}/posts`);

      checkPostedEvents(postEventsMock, numberOfHttpCalls, {
        request: expect.objectContaining({
          requestedAt: expect.any(Date)
        }),
        response: expect.objectContaining({
          respondedAt: expect.any(Date)
        })
      });
    });

    it('should ONLY capture all outgoing 200 http requests after startCapture and before stopCapture, despite other threads also being logged', async () => {
      const numberOfHttpCalls = 5;

      const getInterval = setInterval(async () => {
        await axios.get(`${MOCK_DATA_SERVER}/posts`), 250
      });

      await Supergood.startCapture(
        {
          config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
          clientId: SUPERGOOD_CLIENT_ID,
          clientSecret: SUPERGOOD_CLIENT_SECRET,
          baseUrl: SUPERGOOD_SERVER
        });


      for (let i = 0; i < numberOfHttpCalls; i++) {
        await axios.get(`${MOCK_DATA_SERVER}/posts`);
      }

      await Supergood.stopCapture();

      getInterval.unref();

      checkPostedEvents(postEventsMock, numberOfHttpCalls, {
        request: expect.objectContaining({
          requestedAt: expect.any(Date)
        }),
        response: expect.objectContaining({
          respondedAt: expect.any(Date)
        })
      });
    });
  });


});
