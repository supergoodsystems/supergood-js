import {
  BatchInterceptor,
  InteractiveIsomorphicRequest
} from '@mswjs/interceptors';
import NodeCache from 'node-cache';
import {
  getHeaderOptions,
  logger,
  safeParseJson,
  prepareData,
  shouldCachePayload
} from './utils';
import { postEvents } from './api';
import nodeInterceptors from '@mswjs/interceptors/lib/presets/node';
import browserInterceptors from '@mswjs/interceptors/lib/presets/browser';
import {
  HeaderOptionType,
  EventRequestType,
  ConfigType,
  LoggerType,
  RequestType
} from './types';
import {
  defaultConfig,
  errors,
  TestErrorPath,
  LocalClientId,
  LocalClientSecret
} from './constants';
import onExit from 'signal-exit';

const interceptor = new BatchInterceptor({
  name: 'supergood-interceptor',
  interceptors: [...nodeInterceptors, ...browserInterceptors]
});

const Supergood = () => {
  let eventSinkUrl: string;
  let errorSinkUrl: string;

  let headerOptions: HeaderOptionType;
  let supergoodConfig: ConfigType;

  let requestCache: NodeCache;
  let responseCache: NodeCache;

  let log: LoggerType;
  let interval: NodeJS.Timeout;

  let localOnly = false;

  const init = async (
    {
      clientId,
      clientSecret,
      config
    }: {
      clientId?: string;
      clientSecret?: string;
      config?: Partial<ConfigType>;
    } = {
      clientId: process.env.SUPERGOOD_CLIENT_ID as string,
      clientSecret: process.env.SUPERGOOD_CLIENT_SECRET as string,
      config: {} as Partial<ConfigType>
    },
    baseUrl = process.env.SUPERGOOD_BASE_URL || 'https://dashboard.supergood.ai'
  ) => {
    if (!clientId) throw new Error(errors.NO_CLIENT_ID);
    if (!clientSecret) throw new Error(errors.NO_CLIENT_SECRET);

    if (clientId === LocalClientId || clientSecret === LocalClientSecret) {
      localOnly = true;
    }

    supergoodConfig = {
      ...defaultConfig,
      ...config
    } as ConfigType;

    requestCache = new NodeCache({
      stdTTL: 0
    });
    responseCache = new NodeCache({
      stdTTL: 0
    });

    headerOptions = getHeaderOptions(clientId, clientSecret);
    log = logger({ errorSinkUrl, headerOptions });

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
        log.error(
          errors.CACHING_REQUEST,
          { request, config: supergoodConfig },
          e as Error,
          {
            reportOut: !localOnly
          }
        );
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
          { request, response, config: supergoodConfig },
          e as Error
        );
      }
    });

    errorSinkUrl = `${baseUrl}${supergoodConfig.errorSinkEndpoint}`;
    eventSinkUrl = `${baseUrl}${supergoodConfig.eventSinkEndpoint}`;

    // Flushes the cache every <flushInterval> milliseconds
    interval = setInterval(flushCache, supergoodConfig.flushInterval);
    interval.unref();
  };

  const cacheRequest = async (request: RequestType, baseUrl: string) => {
    if (shouldCachePayload(request.url, baseUrl, supergoodConfig)) {
      requestCache.set(request.id, { request });
      log.debug('Setting Request Cache', {
        request
      });
    }
  };

  const cacheResponse = async (event: EventRequestType, baseUrl: string) => {
    if (shouldCachePayload(event.request.url, baseUrl, supergoodConfig)) {
      responseCache.set(event.request.id, event);
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
    log.debug('Flushing Cache ...', { force });
    const responseCacheKeys = responseCache.keys();
    const requestCacheKeys = requestCache.keys();

    const responseArray = prepareData(
      Object.values(responseCache.mget(responseCacheKeys)),
      supergoodConfig.keysToHash
    ) as Array<EventRequestType>;

    let data = [...responseArray];

    // If force, then we need to flush everything, even uncompleted requests
    if (force) {
      const requestArray = prepareData(
        Object.values(requestCache.mget(requestCacheKeys)),
        supergoodConfig.keysToHash
      ) as Array<EventRequestType>;
      data = [...requestArray, ...responseArray];
    }

    if (data.length === 0) {
      log.debug('Nothing to flush', { force });
      return;
    }

    try {
      if (localOnly) {
        log.debug(JSON.stringify(data, null, 2));
      } else {
        await postEvents(eventSinkUrl, data, headerOptions);
      }
      log.debug(`Flushed ${data.length} events`, { force });
    } catch (e) {
      const error = e as Error;
      if (error.message === errors.UNAUTHORIZED) {
        log.error(
          errors.UNAUTHORIZED,
          { data, config: supergoodConfig },
          error,
          {
            reportOut: false
          }
        );
        clearInterval(interval);
        interceptor.dispose();
      } else {
        log.error(
          errors.POSTING_EVENTS,
          { data, config: supergoodConfig },
          error,
          {
            reportOut: !localOnly
          }
        );
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

export = Supergood();
