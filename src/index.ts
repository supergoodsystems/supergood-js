import { IsomorphicRequest } from '@mswjs/interceptors';
import NodeCache from 'node-cache';
import {
  getHeaderOptions,
  logger,
  safeParseJson,
  prepareData,
  shouldCachePayload,
  sleep
} from './utils';
import { postEvents } from './api';

import { ClientRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/ClientRequest';
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

  let interceptor: ClientRequestInterceptor;

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
    baseUrl = process.env.SUPERGOOD_BASE_URL || 'https://api.supergood.ai'
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
    interceptor = new ClientRequestInterceptor({
      ignoredDomains: supergoodConfig.ignoredDomains
    });

    errorSinkUrl = `${baseUrl}${supergoodConfig.errorSinkEndpoint}`;
    eventSinkUrl = `${baseUrl}${supergoodConfig.eventSinkEndpoint}`;

    headerOptions = getHeaderOptions(clientId, clientSecret);
    log = logger({ errorSinkUrl, headerOptions });

    interceptor.apply();
    interceptor.on('request', async (request: IsomorphicRequest) => {
      const requestId = request.id;
      try {
        const url = new URL(request.url);
        // Meant for debug and testing purposes
        if (url.pathname === TestErrorPath) {
          throw new Error(errors.TEST_ERROR);
        }

        const body = await request.clone().text();
        const requestData = {
          id: requestId,
          headers: Object.fromEntries(request.headers.entries()),
          method: request.method,
          url: url.href,
          path: url.pathname,
          search: url.search,
          body: safeParseJson(body),
          requestedAt: new Date()
        } as RequestType;

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
      const requestId = request.id;
      try {
        const requestData = requestCache.get(requestId) as {
          request: RequestType;
        };
        if (requestData) {
          const responseData = {
            response: {
              headers: Object.fromEntries(response.headers.entries()),
              status: response.status,
              statusText: response.statusText,
              body: response.body && safeParseJson(response.body),
              respondedAt: new Date()
            },
            ...requestData
          } as EventRequestType;
          cacheResponse(responseData, baseUrl);
        }
      } catch (e) {
        log.error(
          errors.CACHING_RESPONSE,
          { request, config: supergoodConfig },
          e as Error
        );
      }
    });

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
  const close = async (force = true) => {
    clearInterval(interval);

    // If there are hanging requests, wait a second
    if (requestCache.keys().length > 0) {
      await sleep(supergoodConfig.waitAfterClose);
    }

    interceptor.dispose();
    await flushCache({ force });
    return false;
  };

  // Set up cleanup catch for exit signals
  onExit(() => close(), { alwaysLast: true });
  return { close, flushCache, init };
};

export = Supergood();
