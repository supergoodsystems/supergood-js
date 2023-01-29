import {
  BatchInterceptor,
  InteractiveIsomorphicRequest
} from '@mswjs/interceptors';
import NodeCache from 'node-cache';
import nodeCleanup from 'node-cleanup';
import { getHeaderOptions } from './utils';
import { postEvents, getConfig, dumpDataToDisk } from './api';
import nodeInterceptors from '@mswjs/interceptors/lib/presets/node';
import { SupergoodPayloadType } from './types';

const interceptor = new BatchInterceptor({
  name: 'supergood-interceptor',
  interceptors: nodeInterceptors
});

const Supergood = async (
  { clientId, clientSecret }: { clientId: string; clientSecret: string },
  baseUrl = 'https://supergood.ai'
) => {
  const options = getHeaderOptions(clientId, clientSecret);
  const config = await getConfig(baseUrl, options);
  const eventSinkUrl = config.eventSinkUrl || `${baseUrl}/api/events`;
  // Why two caches? To quickly only flush the cache with
  // completed responses without having to pull all the keys from one
  // cache and filter out the ones without responses.
  const requestCache = new NodeCache({ stdTTL: config.cacheTtl });
  const responseCache = new NodeCache({ stdTTL: config.cacheTtl });

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
    if (baseUrl !== request.url.origin) {
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

    if (responseCacheKeys.length === 0 && !force) {
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

  // Flush cache at a given interval
  // TODO: Perhaps write a check to flush
  // when exceeding a certain POST threshold size?
  const interval = setInterval(flushCache, config.flushInterval);

  const close = async () => {
    clearInterval(interval);
    interceptor.dispose();
    await flushCache({ force: true });
  };

  // If program ends abruptly, it'll send out
  // whatever logs it already collected
  // TODO Test Manually with CTRL-C ... can't seem to
  // get this to work with Jest
  nodeCleanup((exitCode, signal) => {
    if (signal) {
      flushCache({ force: true }).then(() => {
        process.kill(process.pid, signal);
      });
    }
    nodeCleanup.uninstall();
    return false;
  });

  return { requestCache, responseCache, close, flushCache };
};

export default Supergood;
