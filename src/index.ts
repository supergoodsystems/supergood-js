import NodeCache from 'node-cache';
import { serialize } from 'v8';
import {
  getHeaderOptions,
  logger,
  safeParseJson,
  prepareData,
  sleep,
  processRemoteConfig,
  getEndpointConfigForRequest
} from './utils';
import { postEvents, fetchRemoteConfig } from './api';
import v8 from 'v8';
import {
  HeaderOptionType,
  EventRequestType,
  ConfigType,
  LoggerType,
  RequestType,
  MetadataType
} from './types';
import {
  defaultConfig,
  errors,
  TestErrorPath,
  LocalClientId,
  LocalClientSecret
} from './constants';
import onExit from 'signal-exit';
import { NodeRequestInterceptor } from './interceptor/NodeRequestInterceptor';
import { IsomorphicRequest } from './interceptor/utils/IsomorphicRequest';
import { IsomorphicResponse } from './interceptor/utils/IsomorphicResponse';
import { BatchInterceptor } from './interceptor/BatchInterceptor';
import { FetchInterceptor } from './interceptor/FetchInterceptor';

const Supergood = () => {
  let eventSinkUrl: string;
  let errorSinkUrl: string;
  let remoteConfigFetchUrl: string;

  let headerOptions: HeaderOptionType;
  let supergoodConfig: ConfigType;
  let supergoodMetadata: MetadataType;

  let requestCache: NodeCache;
  let responseCache: NodeCache;

  let log: LoggerType;
  let flushInterval: NodeJS.Timeout;
  let remoteConfigFetchInterval: NodeJS.Timeout;

  let localOnly = false;

  let interceptor: BatchInterceptor;

  const init = async (
    {
      clientId,
      clientSecret,
      config,
      metadata
    }: {
      clientId?: string;
      clientSecret?: string;
      config?: Partial<ConfigType>;
      metadata?: Partial<MetadataType>;
    } = {
      clientId: process.env.SUPERGOOD_CLIENT_ID as string,
      clientSecret: process.env.SUPERGOOD_CLIENT_SECRET as string,
      config: {} as Partial<ConfigType>,
      metadata: {} as Partial<MetadataType>
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
    supergoodMetadata = metadata as MetadataType;

    requestCache = new NodeCache({
      stdTTL: 0
    });
    responseCache = new NodeCache({
      stdTTL: 0
    });
    const interceptorOpts = {
      ignoredDomains: supergoodConfig.ignoredDomains,
      allowLocalUrls: supergoodConfig.allowLocalUrls,
      baseUrl
    };

    interceptor = new BatchInterceptor([
      new NodeRequestInterceptor(interceptorOpts),
      ...(FetchInterceptor.checkEnvironment()
        ? [new FetchInterceptor(interceptorOpts)]
        : [])
    ]);

    errorSinkUrl = `${baseUrl}${supergoodConfig.errorSinkEndpoint}`;
    eventSinkUrl = `${baseUrl}${supergoodConfig.eventSinkEndpoint}`;
    remoteConfigFetchUrl = `${baseUrl}${supergoodConfig.remoteConfigFetchEndpoint}`;

    headerOptions = getHeaderOptions(clientId, clientSecret);
    log = logger({ errorSinkUrl, headerOptions });

    const fetchAndProcessRemoteConfig = async () => {
      try {
        const remoteConfigPayload = await fetchRemoteConfig(remoteConfigFetchUrl, headerOptions);
        supergoodConfig = {
          ...supergoodConfig,
          remoteConfig: processRemoteConfig(remoteConfigPayload)
        };
      } catch (e) {
        log.error(errors.FETCHING_CONFIG, { config: supergoodConfig }, e as Error)
      }
    };

    const initializeInterceptors = () => {
      interceptor.setup();
      interceptor.on(
        'request',
        async (request: IsomorphicRequest, requestId: string) => {
          // Don't intercept if there's no remote config set
          // to avoid sensitive keys being sent to the SG server.
          if(!supergoodConfig.remoteConfig) return;

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

            const endpointConfig = getEndpointConfigForRequest(requestData, supergoodConfig.remoteConfig);
            if (endpointConfig?.ignored) return;

            cacheRequest(requestData, baseUrl);
          } catch (e) {
            log.error(
              errors.CACHING_REQUEST,
              {
                config: supergoodConfig,
                metadata: {
                  requestUrl: request.url.toString(),
                  payloadSize: serialize(request).length,
                  ...supergoodMetadata
                }
              },
              e as Error,
              {
                reportOut: !localOnly
              }
            );
          }
        }
      );

      interceptor.on(
        'response',
        async (response: IsomorphicResponse, requestId: string) => {
          let requestData = { url: '' };
          let responseData = {};

          if(!supergoodConfig.remoteConfig) return;

          try {
            const requestData = requestCache.get(requestId) as {
              request: RequestType;
            };

            if (requestData) {

              const endpointConfig = getEndpointConfigForRequest(requestData.request, supergoodConfig.remoteConfig);
              if (endpointConfig?.ignored) return;

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
              {
                config: supergoodConfig,
                metadata: {
                  ...supergoodMetadata,
                  requestUrl: requestData.url,
                  payloadSize: responseData ? serialize(responseData).length : 0
                }
              },
              e as Error
            );
          }
        }
      );
    };

    // Fetch the initial config and process it
    await fetchAndProcessRemoteConfig();
    initializeInterceptors();

    // Fetch the config ongoing every <remoteConfigFetchInterval> milliseconds
    remoteConfigFetchInterval = setInterval(fetchAndProcessRemoteConfig, supergoodConfig.remoteConfigFetchInterval);
    remoteConfigFetchInterval.unref();

    // Flushes the cache every <flushInterval> milliseconds
    flushInterval = setInterval(flushCache, supergoodConfig.flushInterval);
    // https://httptoolkit.com/blog/unblocking-node-with-unref/
    flushInterval.unref();
  };

  const cacheRequest = async (request: RequestType, baseUrl: string) => {
    requestCache.set(request.id, { request });
    log.debug('Setting Request Cache', {
      request
    });
  };

  const cacheResponse = async (event: EventRequestType, baseUrl: string) => {
    responseCache.set(event.request.id, event);
    log.debug('Setting Response Cache', {
      id: event.request.id,
      ...event
    });
    requestCache.del(event.request.id);
    log.debug('Deleting Request Cache', { id: event.request.id });
  };

  // Force flush cache means don't wait for responses
  const flushCache = async ({ force } = { force: false }) => {
    // log.debug('Flushing Cache ...', { force });
    const responseCacheKeys = responseCache.keys();
    const requestCacheKeys = requestCache.keys();

    const responseArray = prepareData(
      Object.values(responseCache.mget(responseCacheKeys)),
      supergoodConfig.remoteConfig
    ) as Array<EventRequestType>;

    let data = [...responseArray];

    // If force, then we need to flush everything, even uncompleted requests
    if (force) {
      const requestArray = prepareData(
        Object.values(requestCache.mget(requestCacheKeys)),
        supergoodConfig.remoteConfig
      ) as Array<EventRequestType>;
      data = [...requestArray, ...responseArray];
    }

    if (data.length === 0) {
      // log.debug('Nothing to flush', { force });
      return;
    }

    try {
      if (localOnly) {
        log.debug(JSON.stringify(data, null, 2), { force });
      } else {
        await postEvents(eventSinkUrl, data, headerOptions);
      }
      if (data.length) {
        log.debug(`Flushed ${data.length} events`, { force });
        log.debug(`Flushing Ids: ${data.map((event) => event.request.id)}`)
      }
    } catch (e) {
      const error = e as Error;
      if (error.message === errors.UNAUTHORIZED) {
        log.error(
          errors.UNAUTHORIZED,
          { config: supergoodConfig, metadata: { ...supergoodMetadata } },
          error,
          {
            reportOut: false
          }
        );
        clearInterval(flushInterval);
        clearInterval(remoteConfigFetchInterval);
        interceptor.teardown();
      } else {
        log.error(
          errors.POSTING_EVENTS,
          {
            config: supergoodConfig,
            metadata: {
              numberOfEvents: data.length,
              payloadSize: serialize(data).length,
              requestUrls: data.map((event) => event?.request?.url),
              ...supergoodMetadata
            }
          },
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
    clearInterval(flushInterval);
    clearInterval(remoteConfigFetchInterval);

    // If there are hanging requests, wait a second
    if (requestCache.keys().length > 0) {
      await sleep(supergoodConfig.waitAfterClose);
    }

    interceptor.teardown();
    await flushCache({ force });
    return false;
  };

  // Set up cleanup catch for exit signals
  onExit(() => close(), { alwaysLast: true });
  return { close, flushCache, init };
};

export = Supergood();
