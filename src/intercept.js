const { BatchInterceptor } = require('@mswjs/interceptors');
const { getConfig, getAccessToken, flushCache } = require('./api');
const nodeInterceptors =
  require('@mswjs/interceptors/lib/presets/node').default;

const interceptor = new BatchInterceptor({
  name: 'supergood-interceptor',
  interceptors: nodeInterceptors
});

const FLUSH_INTERVAL = 5000;

const init = async ({ clientId, clientSecret }) => {
  let cache = {};
  const { eventPathUrl, tokenExchangeUrl } = await getConfig();
  const accessToken = await getAccessToken({
    clientId,
    clientSecret,
    tokenExchangeUrl
  });
  interceptor.apply();
  interceptor.on('request', async (request) => {
    const requestBody = await request.text();
    cache[request.id] = {
      id: request.id,
      origin: request.url.origin,
      protocol: request.url.protocol,
      hostname: request.url.hostname,
      host: request.url.host,
      pathname: request.url.pathname,
      searchParams: request.url.searchParams,
      requestBody,
      requestedAt: new Date()
    };
  });

  interceptor.on('response', async (request, response) => {
    cache[request.id] = {
      id: request.id,
      ...cache[request.id],
      statusCode: response.status,
      responseBody: response.body,
      respondedAt: new Date()
    };
  });

  setInterval(async () => {
    const flushedCache = { ...cache };
    cache = {};
    await flushCache({ cache: flushedCache, eventPathUrl, accessToken });
  }, FLUSH_INTERVAL);
};

module.exports = { init };
