import {
  BatchInterceptor,
  InteractiveIsomorphicRequest
} from '@mswjs/interceptors';
import NodeCache from 'node-cache';
import { getHeaderOptions, hashValue, logger, dumpDataToDisk } from './utils';
import { postEvents } from './api';
import nodeInterceptors from '@mswjs/interceptors/lib/presets/node';
import { HeaderOptionType, EventRequestType, OptionsType } from './types';
import { signals, defaultOptions, errors, TestErrorPath } from './constants';

const interceptor = new BatchInterceptor({
  name: 'supergood-interceptor',
  interceptors: nodeInterceptors
});

const Supergood = (
  { clientId, clientSecret }: { clientId: string; clientSecret: string },
  inputOptions = {}
) => {
  const options = { ...defaultOptions, ...inputOptions } as OptionsType;
  const errorSinkUrl = `${options.baseUrl}${options.errorSinkEndpoint}`;
  const eventSinkUrl = `${options.baseUrl}${options.eventSinkEndpoint}`;

  // This can update if new config is available after posting events or posting errors
  const headerOptions: HeaderOptionType = getHeaderOptions(
    clientId,
    clientSecret
  );

  // Why two caches? To quickly only flush the cache with
  // completed responses without having to pull all the keys from one
  // cache and filter out the ones without responses.

  const requestCache: NodeCache = new NodeCache({
    stdTTL: options.cacheTtl
  });
  const responseCache: NodeCache = new NodeCache({
    stdTTL: options.cacheTtl
  });

  const log = logger(errorSinkUrl, headerOptions);
  log.debug('Supergood Options', options);

  interceptor.apply();
  interceptor.on('request', async (request: InteractiveIsomorphicRequest) => {
    try {
      // Meant for debug and testing purposes
      if (request.url.pathname === TestErrorPath) {
        throw new Error(errors.TEST_ERROR);
      }

      if (options.baseUrl !== request.url.origin) {
        const body = await request.clone().text();
        requestCache.set(request.id, {
          request: {
            id: request.id,
            method: request.method,
            url: request.url.href,
            protocol: request.url.protocol,
            domain: request.url.host,
            path: request.url.pathname,
            search: request.url.search,
            body: options.hashBody ? { hashed: hashValue(body) } : body,
            requestedAt: new Date()
          }
        });
        log.debug('Setting Request Cache', {
          id: request.id,
          request: {
            id: request.id,
            method: request.method,
            url: request.url.href,
            protocol: request.url.protocol,
            domain: request.url.host,
            endpoint: request.url.pathname,
            search: request.url.search,
            body: options.hashBody ? { hashed: hashValue(body) } : body,
            requestedAt: new Date()
          }
        });
      }
    } catch (e) {
      log.error(errors.CACHING_REQUEST, { request, options }, e as Error);
    }
  });

  interceptor.on('response', async (request, response) => {
    try {
      if (options.baseUrl !== request.url.origin) {
        const requestData = requestCache.get(request.id) || {};
        log.debug('Full Response', response);
        responseCache.set(request.id, {
          response: {
            status: response.status,
            statusText: response.statusText,
            body: options.hashBody
              ? { hashed: hashValue(response.body) }
              : response.body,
            respondedAt: new Date()
          },
          ...requestData
        });
        log.debug('Setting Response Cache', {
          id: request.id,
          response: {
            status: response.status,
            statusText: response.statusText,
            body: options.hashBody
              ? { hashed: hashValue(response.body) }
              : response.body,
            respondedAt: new Date()
          },
          ...requestData
        });
        requestCache.del(request.id);
        log.debug('Deleting Request Cache', { id: request.id });
      }
    } catch (e) {
      log.error(
        errors.CACHING_RESPONSE,
        { request, response, options },
        e as Error
      );
    }
  });

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
        log.error(errors.UNAUTHORIZED, { data, options }, error, {
          reportOut: false
        });
        clearInterval(interval);
        interceptor.dispose();
      } else {
        log.error(errors.POSTING_EVENTS, { data, options }, error);
        dumpDataToDisk(data, log, options); // as backup
      }
    } finally {
      // Delete only the keys sent
      // cache might have been updated
      responseCache.del(responseCacheKeys);

      // Only flush the request cache if we're forcing a flush
      if (force) requestCache.del(requestCacheKeys);
    }
  };

  // Flushes the cache every <flushInterval> milliseconds
  const interval = setInterval(flushCache, options.flushInterval);

  // Stops the interval and disposes of the interceptor
  const close = async (force = true) => {
    clearInterval(interval);
    interceptor.dispose();
    await flushCache({ force });
  };

  // If program ends abruptly, it'll send out
  // whatever logs it already collected.

  const cleanup = (exitCode: number, signal: NodeJS.Signals) => {
    if (signal) {
      flushCache({ force: true }).then(() => {
        process.kill(process.pid, signal);
      });
    }
    // Remove listeners on cleanup
    signals.forEach((signal) => process.removeListener(signal, cleanup));
    return false;
  };

  // Set up cleanup catch for exit signals
  signals.forEach((signal) => process.on(signal, cleanup));

  return { close, flushCache };
};

export default Supergood;
