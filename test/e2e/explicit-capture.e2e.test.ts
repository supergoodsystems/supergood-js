import axios from 'axios';

import Supergood from '../../src';
import {
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
      await Supergood.close();
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
      getInterval.unref();

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
      await Supergood.close();

      clearInterval(getInterval);

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

      Supergood.stopCapture();

      await axios.get(`${MOCK_DATA_SERVER}/posts`);
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

    it('should ONLY capture all outgoing 200 http requests after startCapture and before stopCapture, despite other threads also being logged', async () => {
      const numberOfHttpCalls = 5;

      const getInterval = setInterval(async () => {
        await axios.get(`${MOCK_DATA_SERVER}/posts`), 250
      });

      getInterval.unref();
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

      Supergood.stopCapture();

      await axios.get(`${MOCK_DATA_SERVER}/posts`);
      await Supergood.close();

      clearInterval(getInterval);

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

  it('should capture calls without an async kickoff, with useRemoteConfig set to false', async () => {
    const numberOfHttpCalls = 5;

    const getInterval = setInterval(async () => {
      await axios.get(`${MOCK_DATA_SERVER}/posts`), 250
    });
    getInterval.unref();
    Supergood.startCapture(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true, useRemoteConfig: false },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET,
        baseUrl: SUPERGOOD_SERVER
      });


    for (let i = 0; i < numberOfHttpCalls; i++) {
      await axios.get(`${MOCK_DATA_SERVER}/posts`);
    }

    Supergood.stopCapture();
    await axios.get(`${MOCK_DATA_SERVER}/posts`);

    await Supergood.close();
    clearInterval(getInterval);

    checkPostedEvents(postEventsMock, numberOfHttpCalls, {
      request: expect.objectContaining({
        requestedAt: expect.any(Date)
      }),
      response: expect.objectContaining({
        respondedAt: expect.any(Date)
      })
    });
  });

  it('should support multiple start and stop captures', async () => {
    const numberOfHttpCalls = 5;
    const supergoodArgs = {
      config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true, useRemoteConfig: false },
      clientId: SUPERGOOD_CLIENT_ID,
      clientSecret: SUPERGOOD_CLIENT_SECRET,
      baseUrl: SUPERGOOD_SERVER
    };

    const getInterval = setInterval(async () => {
      await axios.get(`${MOCK_DATA_SERVER}/posts`), 250
    });
    getInterval.unref();

    Supergood.startCapture(supergoodArgs);
    await axios.get('https://supergood-testbed.herokuapp.com/200?say=capture1')
    Supergood.stopCapture();

    await axios.get('https://supergood-testbed.herokuapp.com/200?say=dontcapture')

    Supergood.startCapture(supergoodArgs);
    await axios.get('https://supergood-testbed.herokuapp.com/200?say=capture2')
    Supergood.stopCapture();

    await Supergood.close();

    clearInterval(getInterval);

    checkPostedEvents(postEventsMock, 2, {
      request: expect.objectContaining({
        requestedAt: expect.any(Date)
      }),
      response: expect.objectContaining({
        respondedAt: expect.any(Date)
      })
    });
  });
});
