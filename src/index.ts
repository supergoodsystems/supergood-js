import NodeCache from 'node-cache';
import { serialize } from 'v8';
import {
  getHeaderOptions,
  logger,
  safeParseJson,
  prepareData,
  sleep,
  processRemoteConfig,
  getEndpointConfigForRequest,
  parseResponseBody
} from './utils';
import { postEvents, fetchRemoteConfig, postTelemetry } from './api';
import {
  HeaderOptionType,
  EventRequestType,
  ConfigType,
  LoggerType,
  RequestType,
  MetadataType,
  SupergoodContext
} from './types';
import {
  defaultConfig,
  errors,
  TestErrorPath,
  LocalClientId,
  LocalClientSecret,
  ContentType
} from './constants';
import onExit from 'signal-exit';
import { NodeRequestInterceptor } from './interceptor/NodeRequestInterceptor';
import { IsomorphicRequest } from './interceptor/utils/IsomorphicRequest';
import { IsomorphicResponse } from './interceptor/utils/IsomorphicResponse';
import { BatchInterceptor } from './interceptor/BatchInterceptor';
import { FetchInterceptor } from './interceptor/FetchInterceptor';
import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

const supergoodAsyncLocalStorage = new AsyncLocalStorage<SupergoodContext>();

const Supergood = () => {
  let eventSinkUrl: string;
  let errorSinkUrl: string;
  let remoteConfigFetchUrl: string;
  let telemetryUrl: string;

  let headerOptions: HeaderOptionType;
  let supergoodConfig: ConfigType;
  let supergoodMetadata: MetadataType;
  let supergoodTags: Record<string, string | number | string[]>;
  let supergoodTrace: string | undefined;

  let requestCache: NodeCache;
  let responseCache: NodeCache;

  let log: LoggerType;
  let flushInterval: NodeJS.Timeout;
  let remoteConfigFetchInterval: NodeJS.Timeout;

  let localOnly = false;

  let interceptor: BatchInterceptor;
  const init = <TConfig extends Partial<ConfigType>>(
    {
      clientId,
      clientSecret,
      config,
      metadata,
      tags,
      trace,
      isWithinContext
    }: {
      clientId?: string;
      clientSecret?: string;
      config?: TConfig;
      metadata?: Partial<MetadataType>;
      tags?: Record<string, string | number | string[]>;
      trace?: string;
      isWithinContext?: () => boolean;
    } = {
      clientId: process.env.SUPERGOOD_CLIENT_ID as string,
      clientSecret: process.env.SUPERGOOD_CLIENT_SECRET as string,
      config: {} as TConfig,
      metadata: {} as Partial<MetadataType>,
      tags: {} as Record<string, string | number | string[]>,
      isWithinContext: () => true
    },
    baseUrl = process.env.SUPERGOOD_BASE_URL || 'https://api.supergood.ai',
    baseTelemetryUrl = process.env.SUPERGOOD_TELEMETRY_BASE_URL ||
      'https://telemetry.supergood.ai'
  ): TConfig extends { useRemoteConfig: false } ? void : Promise<void> => {
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

    requestCache =
      requestCache ??
      new NodeCache({
        stdTTL: 0,
        useClones: false
      });
    responseCache =
      responseCache ??
      new NodeCache({
        stdTTL: 0,
        useClones: false
      });

    supergoodTags = tags ?? {};
    supergoodTrace = trace;

    const interceptorOpts = {
      allowedDomains: supergoodConfig.allowedDomains,
      ignoredDomains: supergoodConfig.ignoredDomains,
      allowLocalUrls: supergoodConfig.allowLocalUrls,
      allowIpAddresses: supergoodConfig.allowIpAddresses,
      baseUrl
    };

    interceptor = new BatchInterceptor([
      new NodeRequestInterceptor(interceptorOpts),
      ...(FetchInterceptor.checkEnvironment()
        ? [new FetchInterceptor(interceptorOpts)]
        : [])
    ]);

    eventSinkUrl = `${baseUrl}${supergoodConfig.eventSinkEndpoint}`;
    remoteConfigFetchUrl = `${baseUrl}${supergoodConfig.remoteConfigFetchEndpoint}`;

    telemetryUrl = `${baseTelemetryUrl}${supergoodConfig.telemetryEndpoint}`;
    errorSinkUrl = `${baseTelemetryUrl}${supergoodConfig.errorSinkEndpoint}`;

    headerOptions = getHeaderOptions(
      clientId,
      clientSecret,
      supergoodConfig.timeout
    );
    log = logger({ errorSinkUrl, headerOptions });

    const fetchAndProcessRemoteConfig = async () => {
      try {
        const remoteConfigPayload = await fetchRemoteConfig(
          remoteConfigFetchUrl,
          headerOptions
        );
        supergoodConfig = {
          ...supergoodConfig,
          remoteConfig: processRemoteConfig(remoteConfigPayload)
        };
      } catch (e) {
        log.error(
          errors.FETCHING_CONFIG,
          { config: supergoodConfig },
          e as Error
        );
      }
    };

    const initializeInterceptors = () => {
      isWithinContext = isWithinContext ?? (() => true);
      interceptor.setup({ isWithinContext });
      interceptor.on(
        'request',
        async (request: IsomorphicRequest, requestId: string) => {
          // Don't intercept if there's no remote config set
          // to avoid sensitive keys being sent to the SG server.
          if (!supergoodConfig.remoteConfig) return;

          try {
            const url = new URL(request.url);
            // Meant for debug and testing purposes
            if (url.pathname === TestErrorPath) {
              throw new Error(errors.TEST_ERROR);
            }

            const body = await request.clone().text();
            const requestData = {
              id: requestId,
              headers: supergoodConfig.logRequestHeaders
                ? Object.fromEntries(request.headers.entries())
                : {},
              method: request.method,
              url: url.href,
              path: url.pathname,
              search: url.search,
              body: supergoodConfig.logRequestBody ? safeParseJson(body) : {},
              requestedAt: new Date()
            } as RequestType;

            const endpointConfig = getEndpointConfigForRequest(
              requestData,
              supergoodConfig.remoteConfig
            );
            if (endpointConfig?.ignored) return;

            cacheRequest(requestData, baseUrl);
          } catch (e) {
            log.error(
              errors.CACHING_REQUEST,
              {
                config: supergoodConfig,
                metadata: {
                  requestUrl: request.url.toString(),
                  size: serialize(request).length,
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

          if (!supergoodConfig.remoteConfig) return;

          try {
            const requestData = requestCache.get(requestId) as {
              request: RequestType;
              tags: Record<string, string | number | string[]>;
              trace: string;
            };

            if (requestData) {
              const endpointConfig = getEndpointConfigForRequest(
                requestData.request,
                supergoodConfig.remoteConfig
              );
              if (endpointConfig?.ignored) return;
              const contentType =
                response.headers.get('content-type') ?? ContentType.Text;
              const responseData = {
                response: {
                  headers: supergoodConfig.logResponseHeaders
                    ? Object.fromEntries(response.headers.entries())
                    : {},
                  status: response.status,
                  statusText: response.statusText,
                  body: supergoodConfig.logResponseBody
                    ? parseResponseBody(response.body, contentType)
                    : {},
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
                  requestUrl: requestData.url,
                  size: responseData ? serialize(responseData).length : 0,
                  ...supergoodMetadata
                }
              },
              e as Error
            );
          }
        }
      );
    };

    // Fetch the initial config and process it
    const continuation = supergoodConfig.useRemoteConfig
      ? fetchAndProcessRemoteConfig()
      : void (supergoodConfig.remoteConfig =
          supergoodConfig.remoteConfig ?? {});

    const remainingWork = () => {
      initializeInterceptors();

      if (supergoodConfig.useRemoteConfig && !remoteConfigFetchInterval) {
        // Fetch the config ongoing every <remoteConfigFetchInterval> milliseconds
        remoteConfigFetchInterval = setInterval(
          fetchAndProcessRemoteConfig,
          supergoodConfig.remoteConfigFetchInterval
        );
        remoteConfigFetchInterval.unref();
      }

      // Flushes the cache every <flushInterval> milliseconds
      if (!flushInterval) {
        flushInterval = setInterval(flushCache, supergoodConfig.flushInterval);
        // https://httptoolkit.com/blog/unblocking-node-with-unref/
        flushInterval.unref();
      }
    };

    return (continuation?.then(remainingWork) ??
      remainingWork()) as TConfig extends { useRemoteConfig: false }
      ? void
      : Promise<void>;
  };

  const cacheRequest = async (request: RequestType, baseUrl: string) => {
    requestCache.set(request.id, {
      request,
      tags: getTags(),
      trace: getTrace()
    });
    log.debug('Setting Request Cache', {
      request,
      tags: getTags(),
      trace: getTrace()
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

  const getTags = () => {
    return {
      ...supergoodTags,
      ...(supergoodAsyncLocalStorage.getStore()?.tags || {})
    };
  };

  const getTrace = () => {
    return supergoodAsyncLocalStorage.getStore()?.trace || supergoodTrace;
  };

  // Force flush cache means don't wait for responses
  const flushCache = async ({ force } = { force: false }) => {
    if (!responseCache || !requestCache) {
      return;
    }

    const responseCacheKeys = responseCache.keys();
    const requestCacheKeys = requestCache.keys();
    const responseCacheValues = Object.values(
      responseCache.mget(responseCacheKeys)
    );
    const requestCacheValues = Object.values(
      requestCache.mget(requestCacheKeys)
    );
    const { keys, vsize } = responseCache.getStats();

    // Delete cache before posting and parsing, since everything is loaded in local memory
    // TODO: Perhaps optionally write to disk if posting fails

    responseCache.del(responseCacheKeys);
    if (force) requestCache.del(requestCacheKeys);

    const responseArray = prepareData(
      responseCacheValues as EventRequestType[],
      supergoodConfig
    ) as Array<EventRequestType>;

    let data = [...responseArray];

    // If force, then we need to flush everything, even uncompleted requests
    if (force) {
      const requestArray = prepareData(
        requestCacheValues as EventRequestType[],
        supergoodConfig
      ) as Array<EventRequestType>;
      data = [...requestArray, ...responseArray];
    }

    if (data.length === 0) {
      return;
    }

    try {
      // Post the telemetry after the events make it, but before we delete the cache
      if (supergoodConfig.useTelemetry) {
        await postTelemetry(
          telemetryUrl,
          { cacheKeys: keys, cacheSize: vsize, ...supergoodMetadata },
          headerOptions
        );
      }
    } catch (e) {
      const error = e as Error;
      log.error(
        errors.POSTING_TELEMETRY,
        {
          config: supergoodConfig,
          metadata: {
            keys,
            size: vsize,
            ...supergoodMetadata
          }
        },
        error,
        {
          reportOut: !localOnly
        }
      );
    }

    try {
      if (localOnly) {
        log.debug(JSON.stringify(data, null, 2), { force });
      } else {
        await postEvents(eventSinkUrl, data, headerOptions);
      }
      if (data.length) {
        log.debug(`Flushed ${data.length} events`, { force });
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
              keys: data.length,
              size: serialize(data).length,
              ...supergoodMetadata
            }
          },
          error,
          {
            reportOut: !localOnly
          }
        );
      }
    }
  };

  // Stops the interval and disposes of the interceptor
  const close = async (force = true) => {
    clearInterval(flushInterval);
    clearInterval(remoteConfigFetchInterval);

    // If there are hanging requests, wait a second
    if (requestCache?.keys().length > 0) {
      await sleep(supergoodConfig.waitAfterClose);
    }

    interceptor?.teardown();
    await flushCache({ force });
    return false;
  };

  const waitAndFlushCache = async ({ force } = { force: false }) => {
    // If the request cache isn't empty, this means that
    // there are responses that are still being processed.
    // Wait for them to finish before flushing the cache.
    if (requestCache?.keys().length > 0) {
      await sleep(supergoodConfig.waitAfterClose);
    }

    await flushCache({ force });
  };

  const withTags = async <TRet>(
    tags: Record<string, string | number | string[]>,
    trace: string = '',
    fn: () => Promise<TRet>
  ): Promise<TRet> => {
    const existingTags = supergoodAsyncLocalStorage.getStore()?.tags || {};
    return supergoodAsyncLocalStorage.run(
      { tags: { ...tags, ...existingTags }, trace },
      fn
    );
  };

  const withCapture = async <TRet>(
    {
      clientId,
      clientSecret,
      config,
      tags,
      trace,
      baseUrl,
      baseTelemetryUrl
    }: {
      clientId?: string;
      clientSecret?: string;
      config?: Partial<ConfigType>;
      tags?: Record<string, string | number | string[]>;
      trace?: string;
      baseUrl?: string;
      baseTelemetryUrl?: string;
    },
    fn: () => Promise<TRet>
  ): Promise<TRet> => {
    const instanceId = crypto.randomUUID();
    return supergoodAsyncLocalStorage.run(
      { tags, instanceId, trace },
      async () => {
        await init(
          {
            clientId,
            clientSecret,
            config,
            tags,
            isWithinContext: () =>
              supergoodAsyncLocalStorage.getStore()?.instanceId === instanceId
          },
          baseUrl,
          baseTelemetryUrl
        );
        return fn();
      }
    );
  };

  const startCapture = ({
    clientId,
    clientSecret,
    config,
    tags,
    trace,
    baseUrl,
    baseTelemetryUrl
  }: {
    clientId?: string;
    clientSecret?: string;
    config?: Partial<ConfigType>;
    tags?: Record<string, string | number | string[]>;
    trace: string;
    baseUrl?: string;
    baseTelemetryUrl?: string;
  }) => {
    const instanceId = crypto.randomUUID();
    supergoodAsyncLocalStorage.enterWith({ instanceId, tags, trace });
    return init(
      {
        clientId,
        clientSecret,
        config,
        tags,
        trace,
        isWithinContext: () =>
          supergoodAsyncLocalStorage.getStore()?.instanceId === instanceId
      },
      baseUrl,
      baseTelemetryUrl
    );
  };

  const stopCapture = () => {
    supergoodAsyncLocalStorage.disable();
  };

  const getAsyncLocalStorage = () => supergoodAsyncLocalStorage.getStore();

  // Set up cleanup catch for exit signals
  onExit(() => close(), { alwaysLast: true });

  return {
    close,
    flushCache,
    waitAndFlushCache,
    withTags,
    init,
    withCapture,
    startCapture,
    stopCapture,
    getAsyncLocalStorage
  };
};

export = Supergood();
