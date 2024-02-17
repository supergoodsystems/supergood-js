import localForage from 'localforage';
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
import {
  HeaderOptionType,
  EventRequestType,
  ConfigType,
  LoggerType,
  RequestType,
  MetadataType,
  RemoteConfigPayloadType,
  RemoteConfigType
} from './types';
import {
  defaultConfig,
  errors,
  TestErrorPath,
  LocalClientId
} from './constants';
import { BatchInterceptor } from '@mswjs/interceptors';
import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
import { isInterceptable } from './interceptor/utils/isInterceptable';

const Supergood = () => {
  let eventSinkUrl: string;
  let errorSinkUrl: string;
  let remoteConfigFetchUrl: string;
  let baseUrl: string;

  let headerOptions: HeaderOptionType;
  let supergoodConfig: ConfigType;
  let supergoodMetadata: MetadataType;

  let requestCache: LocalForage;
  let responseCache: LocalForage;
  let remoteConfigCache: LocalForage;

  let log: LoggerType;
  let flushInterval: NodeJS.Timeout;
  let remoteConfigFetchInterval: NodeJS.Timeout;

  let localOnly = false;

  let interceptor = new BatchInterceptor({
    name: 'supergood-interceptor',
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()]
  });

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
      clientId: '' as string,
      config: {} as Partial<ConfigType>,
      metadata: {} as Partial<MetadataType>
    }
  ) => {
    if (typeof window === 'undefined') {
      console.warn('Supergood is only supported in the browser environment');
      return;
    } else {
      console.log('Supergood-browser loaded!');
    }

    if (!clientId) throw new Error(errors.NO_CLIENT_ID);
    if (!clientSecret) throw new Error(errors.NO_CLIENT_SECRET);

    if (clientId === LocalClientId) {
      localOnly = true;
    }

    supergoodConfig = {
      ...defaultConfig,
      ...config
    } as ConfigType;
    supergoodMetadata = metadata as MetadataType;
    baseUrl = supergoodConfig.baseUrl || 'https://api.supergood.ai';
    localForage.config({
      driver: localForage.LOCALSTORAGE,
      name: 'supergood',
      version: 1.0,
      storeName: 'supergood',
      description: 'Supergood Cache'
    });

    remoteConfigCache = localForage.createInstance({
      name: 'remoteConfigCache'
    });

    requestCache = localForage.createInstance({
      name: 'requestCache'
    });

    responseCache = localForage.createInstance({
      name: 'responseCache'
    });
    debugger;

    errorSinkUrl = `${baseUrl}${supergoodConfig.errorSinkEndpoint}`;
    eventSinkUrl = `${baseUrl}${supergoodConfig.eventSinkEndpoint}`;
    remoteConfigFetchUrl = `${baseUrl}${supergoodConfig.remoteConfigFetchEndpoint}`;

    headerOptions = getHeaderOptions(clientId, clientSecret);
    log = logger({
      errorSinkUrl,
      headerOptions,
      logLevel: supergoodConfig.logLevel
    });

    const fetchAndProcessRemoteConfig = async () => {
      try {
        let remoteConfigPayload = await remoteConfigCache.getItem(
          'remoteConfig'
        );
        console.log({ remoteConfigPayload });
        if (!remoteConfigPayload) {
          console.log('Fetching remote config');
          remoteConfigPayload = await fetchRemoteConfig(
            remoteConfigFetchUrl,
            headerOptions
          );
          console.log({ remoteConfigPayload });
          remoteConfigCache.setItem('remoteConfig', {
            ...supergoodConfig,
            remoteConfig: processRemoteConfig(
              remoteConfigPayload as RemoteConfigPayloadType
            )
          });
        }
      } catch (e) {
        log.error(
          errors.FETCHING_CONFIG,
          { config: supergoodConfig },
          e as Error
        );
      }
    };

    const initializeInterceptors = () => {
      debugger;
      const requestIdsToIntercept = new Set<string>();

      interceptor.on('request', async ({ request, requestId }) => {
        debugger;
        // Don't intercept if there's no remote config set
        // to avoid sensitive keys being sent to the SG server.
        const config: ConfigType | null = await remoteConfigCache.getItem(
          'remoteConfig'
        );
        if (!config) return;
        const shouldIntercept = isInterceptable({
          url: new URL(request.url),
          allowLocalUrls: config.allowLocalUrls,
          baseUrl: config.baseUrl,
          ignoredDomains: config.ignoredDomains
        });
        if (!shouldIntercept) {
          return;
        }
        requestIdsToIntercept.add(requestId);
        try {
          const url = new URL(request.url);
          // Meant for debug and testing purposes
          if (url.pathname === TestErrorPath) {
            throw new Error(errors.TEST_ERROR);
          }

          const body = await request.clone().text();
          const requestData = {
            id: requestId,
            headers: config.logRequestHeaders
              ? Object.fromEntries(request.headers.entries())
              : {},
            method: request.method,
            url: url.href,
            path: url.pathname,
            search: url.search,
            body: config.logRequestBody ? safeParseJson(body) : {},
            requestedAt: new Date()
          } as RequestType;

          const endpointConfig = getEndpointConfigForRequest(
            requestData,
            config.remoteConfig
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
                ...supergoodMetadata
              }
            },
            e as Error,
            {
              reportOut: !localOnly
            }
          );
        }
      });
      interceptor.on('response', async ({ response, requestId }) => {
        let requestData = { url: '' };
        let responseData = {};

        const config: ConfigType | null = await remoteConfigCache.getItem(
          'remoteConfig'
        );
        if (!config) return;
        const shouldIntercept = requestIdsToIntercept.has(requestId);
        requestIdsToIntercept.delete(requestId);
        if (!shouldIntercept) {
          return;
        }
        try {
          const requestData = (await requestCache.getItem(requestId)) as {
            request: RequestType;
          };

          if (requestData) {
            const endpointConfig = getEndpointConfigForRequest(
              requestData.request,
              config.remoteConfig
            );
            if (endpointConfig?.ignored) return;

            const responseData = {
              response: {
                headers: config.logResponseHeaders
                  ? Object.fromEntries(response.headers.entries())
                  : {},
                status: response.status,
                statusText: response.statusText,
                body: config.logResponseBody
                  ? response.body && safeParseJson(await response.text())
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
                ...supergoodMetadata
              }
            },
            e as Error
          );
        }
      });

      interceptor.apply();
      debugger;
    };

    // Fetch the initial config and process it
    await fetchAndProcessRemoteConfig();
    initializeInterceptors();

    // Flushes the cache every <flushInterval> milliseconds
    flushInterval = setInterval(flushCache, supergoodConfig.flushInterval);
  };

  const cacheRequest = async (request: RequestType, baseUrl: string) => {
    await requestCache.setItem(request.id, { request });
    log.debug('Setting Request Cache', {
      request
    });
  };

  const cacheResponse = async (event: EventRequestType, baseUrl: string) => {
    await responseCache.setItem(event.request.id, event);
    log.debug('Setting Response Cache', {
      id: event.request.id,
      ...event
    });
    await requestCache.removeItem(event.request.id);
    log.debug('Deleting Request Cache', { id: event.request.id });
  };

  // Force flush cache means don't wait for responses
  const flushCache = async ({ force } = { force: false }) => {
    log.debug('Flushing Cache ...', { force });
    const config: ConfigType | null = await remoteConfigCache.getItem(
      'remoteConfig'
    );
    if (!config) return;
    
    let requestArray = [] as EventRequestType[];
    let responseArray = [] as EventRequestType[];

    await responseCache.iterate((event: EventRequestType, key) => {
      console.log('response cache', {event, key})
      debugger;
      if (event) {
        responseArray.push(
          prepareData(event, config.remoteConfig) as EventRequestType
        );
      }
    });
    await responseCache.clear();

    let data = [...responseArray];

    // If force, then we need to flush everything, even uncompleted requests
    if (force) {
      await requestCache.iterate((event: EventRequestType, key) => {
        console.log('request cache', {event, key})
        debugger;
        if (event) {
          requestArray.push(
            prepareData(event, config.remoteConfig) as EventRequestType
          );
        }
      });
      await requestCache.clear();
      data = [...requestArray, ...responseArray];
    }

    if (data.length === 0) {
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
        interceptor.dispose();
      } else {
        log.error(
          errors.POSTING_EVENTS,
          {
            config: supergoodConfig,
            metadata: {
              keys: data.length,
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
    const hangingRequestsArray = await requestCache.keys();
    if (hangingRequestsArray.length > 0) {
      await sleep(supergoodConfig.waitAfterClose);
    }

    interceptor.dispose();
    await flushCache({ force });
    return false;
  };

  return { close, flushCache, init };
};

export default Supergood();
