import {
  BatchInterceptor,
  InteractiveIsomorphicRequest
} from '@mswjs/interceptors';
import NodeCache from 'node-cache';
import { getHeaderOptions } from './utils';
import { postEvents, dumpDataToDisk } from './api';
import nodeInterceptors from '@mswjs/interceptors/lib/presets/node';
import { HeaderOptionType, SupergoodPayloadType } from './index.d';
import { signals } from './constants';

const interceptor = new BatchInterceptor({
  name: 'supergood-interceptor',
  interceptors: nodeInterceptors
});

const defaultConfig = {
  keysToHash: ['request.body', 'response.body'],
  flushInterval: 1000,
  cacheTtl: 0,
  baseUrl: 'https://supergood.ai',
  eventSinkUrl: 'https://supergood.ai/api/events'
};

const Supergood = (
  { clientId, clientSecret }: { clientId: string; clientSecret: string },
  config = defaultConfig
) => {
  const { cacheTtl, baseUrl, flushInterval, eventSinkUrl } = config;

  const options: HeaderOptionType = getHeaderOptions(clientId, clientSecret);
  const requestCache: NodeCache = new NodeCache({ stdTTL: cacheTtl });
  const responseCache: NodeCache = new NodeCache({ stdTTL: cacheTtl });

  // Why two caches? To quickly only flush the cache with
  // completed responses without having to pull all the keys from one
  // cache and filter out the ones without responses.

  interceptor.apply();
  interceptor.on('request', async (request: InteractiveIsomorphicRequest) => {
    if (baseUrl !== request.url.origin) {
      const requestBody = await request.text();
      requestCache.set(request.id, {
        request: {
          id: request.id,
          method: request.method,
          origin: request.url.origin,
          protocol: request.url.protocol,
          hostname: request.url.hostname,
          host: request.url.host,
          pathname: request.url.pathname,
          search: request.url.search,
          requestBody,
          requestedAt: new Date()
        }
      });
    }
  });

  interceptor.on('response', async (request, response) => {
    if (config.baseUrl !== request.url.origin) {
      const requestData = requestCache.get(request.id) || {};
      responseCache.set(request.id, {
        response: {
          status: response.status,
          responseBody: response.body,
          respondedAt: new Date()
        },
        ...requestData
      });
      requestCache.del(request.id);
    }
  });

  // Force flush cache means don't wait for responses
  const flushCache = async ({ force } = { force: false }) => {
    // Only flush keys that have a response
    const responseCacheKeys = responseCache.keys();
    const requestCacheKeys = requestCache.keys();

    const responseArray = Object.values(
      responseCache.mget(responseCacheKeys)
    ) as Array<SupergoodPayloadType>;

    // If there's nothing in the response cache, and we're not forcing a flush,
    // just exit here

    if (responseCacheKeys.length === 0 && !force) {
      return;
    }

    // If we're forcing a flush but there's nothing in the cache, exit here
    if (
      force &&
      responseCacheKeys.length === 0 &&
      requestCacheKeys.length === 0
    ) {
      return;
    }

    let data = [...responseArray];

    // If force, then we need to flush everything, even uncompleted requests
    if (force) {
      const requestArray = Object.values(
        requestCache.mget(requestCacheKeys)
      ) as Array<SupergoodPayloadType>;
      data = [...requestArray, ...responseArray];
    }

    try {
      const response = await postEvents(eventSinkUrl, data, options);
      if (!response || response.statusCode !== 200) {
        dumpDataToDisk(data); // as backup
      }
    } catch (e) {
      dumpDataToDisk(data); // as backup
    } finally {
      // Delete only the keys sent
      // cache might have been updated
      responseCache.del(responseCacheKeys);
      requestCache.del(requestCacheKeys);
    }
  };

  // Flushes the cache every <flushInterval> milliseconds
  const interval = setInterval(flushCache, flushInterval);

  // Stops the interval and disposes of the interceptor
  const close = async (force = true) => {
    clearInterval(interval);
    interceptor.dispose();
    await flushCache({ force });
  };

  // If program ends abruptly, it'll send out
  // whatever logs it already collected
  // TODO Test Manually with CTRL-C ... can't seem to
  // get this to work with Jest

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

  signals.forEach((signal) => process.on(signal, cleanup));

  return { close };
};

export default Supergood;
