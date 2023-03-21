import {
  BatchInterceptor,
  InteractiveIsomorphicRequest
} from '@mswjs/interceptors';
import NodeCache from 'node-cache';
import {
  getHeaderOptions,
  logger,
  hashValuesFromkeys,
  safeParseJson
} from './utils';
import { fetchConfig, postEvents } from './api';
import nodeInterceptors from '@mswjs/interceptors/lib/presets/node';
import {
  HeaderOptionType,
  EventRequestType,
  ConfigType,
  LoggerType
} from './types';
import { signals, errors, TestErrorPath } from './constants';
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

    headerOptions = getHeaderOptions(clientId, clientSecret);
    config = await fetchConfig(`${baseUrl}/api/config`, headerOptions);

    errorSinkUrl = `${baseUrl}${config.errorSinkEndpoint}`;
    eventSinkUrl = `${baseUrl}${config.eventSinkEndpoint}`;

    // This can update if new config is available after posting events or posting errors

    // Why two caches? To quickly only flush the cache with
    // completed responses without having to pull all the keys from one
    // cache and filter out the ones without responses.

    requestCache = new NodeCache({
      stdTTL: config.cacheTtl
    });
    responseCache = new NodeCache({
      stdTTL: config.cacheTtl
    });

    log = logger(errorSinkUrl, headerOptions);

    // Flushes the cache every <flushInterval> milliseconds
    interval = setInterval(flushCache, config.flushInterval);
    interval.unref();

    interceptor.apply();
    interceptor.on('request', async (request: InteractiveIsomorphicRequest) => {
      try {
        // Meant for debug and testing purposes
        if (request.url.pathname === TestErrorPath) {
          throw new Error(errors.TEST_ERROR);
        }

        if (
          baseUrl !== request.url.origin &&
          !config.ignoredDomains.includes(request.url.host)
        ) {
          const body = await request.clone().text();
          const requestData = hashValuesFromkeys(
            {
              request: {
                id: request.id,
                headers: request.headers,
                method: request.method,
                url: request.url.href,
                path: request.url.pathname,
                search: request.url.search,
                body: safeParseJson(body),
                requestedAt: new Date()
              }
            },
            config.keysToHash
          );
          requestCache.set(request.id, requestData);
          log.debug('Setting Request Cache', {
            id: request.id,
            ...requestData
          });
        }
      } catch (e) {
        log.error(errors.CACHING_REQUEST, { request, config }, e as Error);
      }
    });

    interceptor.on('response', async (request, response) => {
      try {
        if (
          baseUrl !== request.url.origin &&
          !config.ignoredDomains.includes(request.url.host)
        ) {
          const requestData = requestCache.get(request.id) || {};
          const responseData = hashValuesFromkeys(
            {
              response: {
                headers: response.headers,
                status: response.status,
                statusText: response.statusText,
                body: response.body && safeParseJson(response.body),
                respondedAt: new Date()
              },
              ...requestData
            },
            config.keysToHash
          );
          responseCache.set(request.id, responseData);
          log.debug('Setting Response Cache', {
            id: request.id,
            ...responseData
          });
          requestCache.del(request.id);
          log.debug('Deleting Request Cache', { id: request.id });
        }
      } catch (e) {
        log.error(
          errors.CACHING_RESPONSE,
          { request, response, config },
          e as Error
        );
      }
    });
  };

  // Force flush cache means don't wait for responses
  const flushCache = async ({ force } = { force: false }) => {
    log.debug('Flushing Cache ...', { force });
    const responseCacheKeys = responseCache.keys();
    const requestCacheKeys = requestCache.keys();

    const responseArray = Object.values(
      responseCache.mget(responseCacheKeys)
    ) as Array<EventRequestType>;

    // If there's nothing in the response cache, and we're not forcing a flush,
    // just exit here

    if (responseCacheKeys.length === 0 && !force) {
      log.debug('Nothing to flush', { force });
      return;
    }

    // If we're forcing a flush but there's nothing in the cache, exit here
    if (
      force &&
      responseCacheKeys.length === 0 &&
      requestCacheKeys.length === 0
    ) {
      log.debug('Nothing to flush', { force });
      return;
    }

    let data = [...responseArray];

    // If force, then we need to flush everything, even uncompleted requests
    if (force) {
      const requestArray = Object.values(
        requestCache.mget(requestCacheKeys)
      ) as Array<EventRequestType>;
      data = [...requestArray, ...responseArray];
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

  const cleanup = (exitCode: number | null, signal: string | null) => {
    log.debug('Cleaning up, flushing cache gracefully.');
    if (signal) {
      interceptor.dispose();
      flushCache({ force: true }).then(() => {
        process.kill(process.pid, signal);
      });
    }
    return false;
  };

  // Set up cleanup catch for exit signals
  onExit((code, signal) => cleanup(code, signal), { alwaysLast: true });
  return { close, flushCache, init };
};

const sg = Supergood();

export default sg;
module.exports = sg;
