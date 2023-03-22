import {
  BatchInterceptor,
  InteractiveIsomorphicRequest
} from '@mswjs/interceptors';
import NodeCache from 'node-cache';
import {
  getHeaderOptions,
  logger,
  hashValuesFromKeys,
  safeParseJson,
  prepareData
} from './utils';
import { fetchConfig, postEvents } from './api';
import nodeInterceptors from '@mswjs/interceptors/lib/presets/node';
import {
  HeaderOptionType,
  EventRequestType,
  ConfigType,
  LoggerType,
  RequestType
} from './types';
import { errors, TestErrorPath } from './constants';
import onExit from 'signal-exit';

const interceptor = new BatchInterceptor({
  name: 'supergood-interceptor',
  interceptors: nodeInterceptors
});

const Supergood = () => {
  let eventSinkUrl: string;
  let errorSinkUrl: string;

  let headerOptions: HeaderOptionType;
  let config: ConfigType;

  let requestCache: NodeCache;
  let responseCache: NodeCache;

  let log: LoggerType;
  let interval: NodeJS.Timeout;

  const init = async (
    { clientId, clientSecret } = {
      clientId: process.env.SUPERGOOD_CLIENT_ID,
      clientSecret: process.env.SUPERGOOD_CLIENT_SECRET
    },
    baseUrl = process.env.SUPERGOOD_BASE_URL || 'https://dashboard.supergood.ai'
  ) => {
    if (!clientId) throw new Error(errors.NO_CLIENT_ID);
    if (!clientSecret) throw new Error(errors.NO_CLIENT_SECRET);

    requestCache = new NodeCache({
      stdTTL: 0
    });
    responseCache = new NodeCache({
      stdTTL: 0
    });

    headerOptions = getHeaderOptions(clientId, clientSecret);
    log = logger({ headerOptions });

    interceptor.apply();
    interceptor.on('request', async (request: InteractiveIsomorphicRequest) => {
      try {
        // Meant for debug and testing purposes
        if (request.url.pathname === TestErrorPath) {
          throw new Error(errors.TEST_ERROR);
        }
        const body = await request.clone().text();
        const requestData = {
          id: request.id,
          headers: request.headers,
          method: request.method,
          url: request.url.href,
          path: request.url.pathname,
          search: request.url.search,
          body: safeParseJson(body),
          requestedAt: new Date()
        };
        cacheRequest(requestData, baseUrl);
      } catch (e) {
        log.error(errors.CACHING_REQUEST, { request, config }, e as Error);
      }
    });

    interceptor.on('response', async (request, response) => {
      try {
        const requestData = requestCache.get(request.id) as {
          request: RequestType;
        };
        if (requestData) {
          const responseData = {
            response: {
              headers: response.headers,
              status: response.status,
              statusText: response.statusText,
              body: response.body && safeParseJson(response.body),
              respondedAt: new Date()
            },
            ...requestData
          };
          cacheResponse(responseData, baseUrl);
        }
      } catch (e) {
        log.error(
          errors.CACHING_RESPONSE,
          { request, response, config },
          e as Error
        );
      }
    });

    headerOptions = getHeaderOptions(clientId, clientSecret);
    config = await fetchConfig(`${baseUrl}/api/config`, headerOptions);

    errorSinkUrl = `${baseUrl}${config.errorSinkEndpoint}`;
    eventSinkUrl = `${baseUrl}${config.eventSinkEndpoint}`;
    log = logger({ errorSinkUrl, headerOptions });

    // Flushes the cache every <flushInterval> milliseconds
    interval = setInterval(flushCache, config.flushInterval);
    interval.unref();
  };

  const cacheRequest = async (request: RequestType, baseUrl: string) => {
    const url = new URL(request.url);
    if (baseUrl !== url.origin) {
      requestCache.set(request.id, { request });
      log.debug('Setting Request Cache', {
        request
      });
    }
  };

  const cacheResponse = async (event: EventRequestType, baseUrl: string) => {
    const url = new URL(event.request.url);
    if (baseUrl !== url.origin) {
      responseCache.set(
        event.request.id,
        hashValuesFromKeys(event, config.keysToHash)
      );
      log.debug('Setting Response Cache', {
        id: event.request.id,
        ...event
      });
      requestCache.del(event.request.id);
      log.debug('Deleting Request Cache', { id: event.request.id });
    }
  };

  // Force flush cache means don't wait for responses
  const flushCache = async ({ force } = { force: false }) => {
    if (!config) {
      log.debug(
        'Config not loaded, waiting for config to load before flushing cache',
        { force }
      );
    }

    log.debug('Flushing Cache ...', { force });
    const responseCacheKeys = responseCache.keys();
    const requestCacheKeys = requestCache.keys();

    const responseArray = prepareData(
      Object.values(responseCache.mget(responseCacheKeys)),
      config.ignoredDomains,
      config.keysToHash
    ) as Array<EventRequestType>;

    let data = [...responseArray];

    // If force, then we need to flush everything, even uncompleted requests
    if (force) {
      const requestArray = prepareData(
        Object.values(requestCache.mget(requestCacheKeys)),
        config.ignoredDomains,
        config.keysToHash
      ) as Array<EventRequestType>;
      data = [...requestArray, ...responseArray];
    }

    if (data.length === 0) {
      log.debug('Nothing to flush', { force });
      return;
    }

    try {
      await postEvents(eventSinkUrl, data, headerOptions);
      log.debug(`Flushed ${data.length} events`, { force });
    } catch (e) {
      const error = e as Error;
      if (error.message === errors.UNAUTHORIZED) {
        log.error(errors.UNAUTHORIZED, { data, config }, error, {
          reportOut: false
        });
        clearInterval(interval);
        interceptor.dispose();
      } else {
        log.error(errors.POSTING_EVENTS, { data, config }, error);
      }
    } finally {
      // Delete only the keys sent
      // cache might have been updated
      responseCache.del(responseCacheKeys);

      // Only flush the request cache if we're forcing a flush
      if (force) requestCache.del(requestCacheKeys);
    }
  };

  // Stops the interval and disposes of the interceptor
  const close = (force = true) => {
    clearInterval(interval);
    interceptor.dispose();
    return flushCache({ force });
  };

  // If program ends abruptly, it'll send out
  // whatever logs it already collected.

  const cleanup = async () => {
    log.debug('Cleaning up, flushing cache gracefully.');
    clearInterval(interval);
    interceptor.dispose();
    await flushCache({ force: true });

    return false;
  };

  // Set up cleanup catch for exit signals
  onExit(() => cleanup(), { alwaysLast: true });
  return { close, flushCache, init };
};

const sg = Supergood();

export default sg;
module.exports = sg;
