const { BatchInterceptor } = require('@mswjs/interceptors');
const NodeCache = require('node-cache');
const nodeCleanup = require('node-cleanup');
const { getKeyValueByString, getOptions } = require('./utils');
const { getConfig, postEvents, dumpDataToDisk } = require('./api');

const nodeInterceptors =
  require('@mswjs/interceptors/lib/presets/node').default;

const interceptor = new BatchInterceptor({
  name: 'supergood-interceptor',
  interceptors: nodeInterceptors
});

const init = async (
  { clientId, clientSecret },
  baseUrl = 'https://supergood.ai'
) => {
  const options = getOptions(clientId, clientSecret);
  const { keys, flushInterval, cacheTtl } = await getConfig(baseUrl, options);

  const requestCache = new NodeCache({ stdTTL: cacheTtl });
  const responseCache = new NodeCache({ stdTTL: cacheTtl });

  interceptor.apply();
  interceptor.on('request', async (request) => {
    const requestBody = await request.text();
    requestCache.set(request.id, {
      ...keys.request.reduce((acc, k) => {
        const { key, value } = getKeyValueByString(request, k);
        acc[key] = value;
        return acc;
      }, {}),
      requestBody,
      requestedAt: new Date()
    });
  });

  interceptor.on('response', async (request, response) => {
    const requestData = requestCache.get(request.id);
    responseCache.set(request.id, {
      ...keys.response.reduce((acc, k) => {
        const { key, value } = getKeyValueByString(response, k);
        acc[key] = value;
        return acc;
      }, {}),
      ...requestData,
      respondedAt: new Date()
    });
  });

  // Force flush cache means don't wait for responses
  const flushCache = async ({ force } = { force: false }) => {
    const keysToFlush = responseCache.keys();
    if (keysToFlush.length === 0 && !force) {
      return;
    }
    let data = responseCache.mget(keysToFlush);
    // Flush both the unfinished requests and
    // the ones with responses
    if (force) {
      const requestKeysToFlush = requestCache.keys();
      data = { ...requestCache.mget(requestKeysToFlush), ...data };
    }

    try {
      const response = await postEvents(baseUrl, data, options);
      if (!response || response.statusCode !== 200) {
        dumpDataToDisk(data); // as backup
      }
    } catch (e) {
      dumpDataToDisk(data); // as backup
    } finally {
      // Delete only the keys sent
      // cache might have been updated
      responseCache.del(keysToFlush);
      requestCache.del(keysToFlush);
    }
  };

  // Flush cache at a given interval
  // TODO: Perhaps write a check to flush
  // when exceeding a certain POST threshold size?
  const interval = setInterval(flushCache, flushInterval);

  const close = async () => {
    clearInterval(interval);
    interceptor.dispose();
    await flushCache({ force: true });
  };

  // If program ends abruptly, it'll send out
  // whatever logs it already collected
  // TODO Test Manually with CTRL-C ... can't seem to
  // get this to work with Jest
  nodeCleanup(async () => {
    await flushCache({ force: true });
  });

  return { requestCache, responseCache, close, flushCache };
};

module.exports = { init };
