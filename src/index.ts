import localForage from "localforage";
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
  RemoteConfigPayloadType
} from './types';
import {
  defaultConfig,
  errors,
  TestErrorPath,
  LocalClientId,
} from './constants';
import { IsomorphicRequest } from './interceptor/utils/IsomorphicRequest';
import { IsomorphicResponse } from './interceptor/utils/IsomorphicResponse';
import { FetchInterceptor } from './interceptor/FetchInterceptor';

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

  let interceptor: FetchInterceptor;

  const init = async (
    {
      clientId,
      config,
      metadata
    }: {
      clientId?: string;
      config?: Partial<ConfigType>;
      metadata?: Partial<MetadataType>;
    } = {
        clientId: '' as string,
        config: {} as Partial<ConfigType>,
        metadata: {} as Partial<MetadataType>
      },
  ) => {

    if(typeof window === 'undefined') {
      console.log('Supergood is only supported in the browser environment')
      return;
    } else {
      console.log('Supergood-browser loaded!')
    }

    if (!clientId) throw new Error(errors.NO_CLIENT_ID);

    if (clientId === LocalClientId) {
      localOnly = true;
    }

    supergoodConfig = {
      ...defaultConfig,
      ...config
    } as ConfigType;
    supergoodMetadata = metadata as MetadataType;
    baseUrl = supergoodConfig.baseUrl || 'https://api.supergood.ai'
    localForage.config({
      driver: localForage.LOCALSTORAGE,
      name: 'supergood',
      version: 1.0,
      storeName: 'supergood',
      description: 'Supergood Cache'
    });

    remoteConfigCache = localForage.createInstance({
      name: 'remoteConfigCache',
    });

    requestCache = localForage.createInstance({
      name: 'requestCache',
    });

    responseCache = localForage.createInstance({
      name: 'responseCache',
    });

    const interceptorOpts = {
      ignoredDomains: supergoodConfig.ignoredDomains,
      allowLocalUrls: supergoodConfig.allowLocalUrls,
      baseUrl
    };

    interceptor = new FetchInterceptor(interceptorOpts)

    errorSinkUrl = `${baseUrl}${supergoodConfig.errorSinkEndpoint}`;
    eventSinkUrl = `${baseUrl}${supergoodConfig.eventSinkEndpoint}`;
    remoteConfigFetchUrl = `${baseUrl}${supergoodConfig.remoteConfigFetchEndpoint}`;

    headerOptions = getHeaderOptions(clientId);
    log = logger({ errorSinkUrl, headerOptions, logLevel: supergoodConfig.logLevel});

    const fetchAndProcessRemoteConfig = async () => {
      try {
        let remoteConfigPayload = await remoteConfigCache.getItem('remoteConfig');
        console.log({ remoteConfigPayload })
        if (!remoteConfigPayload) {
          console.log("Fetching remote config")
          remoteConfigPayload = (await fetchRemoteConfig(remoteConfigFetchUrl, headerOptions));
          console.log({ remoteConfigPayload })
          remoteConfigCache.setItem('remoteConfig', {
            ...supergoodConfig,
            remoteConfig: processRemoteConfig(remoteConfigPayload as RemoteConfigPayloadType)
          });
        }
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
              headers: supergoodConfig.logRequestHeaders ? Object.fromEntries(request.headers.entries()) : {},
              method: request.method,
              url: url.href,
              path: url.pathname,
              search: url.search,
              body: supergoodConfig.logRequestBody ? safeParseJson(body) : {},
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
                  ...supergoodMetadata,
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
            const requestData = await requestCache.getItem(requestId) as {
              request: RequestType;
            };

            if (requestData) {

              const endpointConfig = getEndpointConfigForRequest(requestData.request, supergoodConfig.remoteConfig);
              if (endpointConfig?.ignored) return;

              const responseData = {
                response: {
                  headers: supergoodConfig.logResponseHeaders ? Object.fromEntries(response.headers.entries()) : {},
                  status: response.status,
                  statusText: response.statusText,
                  body: supergoodConfig.logResponseBody ? response.body && safeParseJson(response.body) : {},
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
        }
      );
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
    // log.debug('Flushing Cache ...', { force });

    let requestArray = [] as EventRequestType[];
    let responseArray = [] as EventRequestType[];

    await responseCache.iterate((event: EventRequestType, key) => {
      if(event) {
        responseArray.push(prepareData(event, supergoodConfig.remoteConfig) as EventRequestType);
      }
    });
    await responseCache.clear();

    let data = [...responseArray];

    // If force, then we need to flush everything, even uncompleted requests
    if (force) {
      await requestCache.iterate((event: EventRequestType, key) => {
        if(event) {
          requestArray.push(prepareData(event, supergoodConfig.remoteConfig) as EventRequestType);
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
        interceptor.teardown();
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

    interceptor.teardown();
    await flushCache({ force });
    return false;
  };

  return { close, flushCache, init };
};

export = Supergood();
