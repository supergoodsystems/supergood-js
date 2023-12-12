import {
  Agent as HttpAgent,
  globalAgent as httpGlobalAgent,
  IncomingMessage
} from 'http';
import {
  RequestOptions,
  Agent as HttpsAgent,
  globalAgent as httpsGlobalAgent
} from 'https';
import { Url as LegacyURL, parse as parseUrl } from 'url';
import { getRequestOptionsByUrl } from './getRequestOptionsByUrl';
import {
  ResolvedRequestOptions,
  getUrlByRequestOptions
} from './getUrlByRequestOptions';
import { cloneObject } from './cloneObject';
import { isObject } from './isObject';

export type HttpRequestCallback = (response: IncomingMessage) => void;

export type ClientRequestArgs =
  // Request without any arguments is also possible.
  | []
  | [string | URL | LegacyURL, HttpRequestCallback?]
  | [string | URL | LegacyURL, RequestOptions, HttpRequestCallback?]
  | [RequestOptions, HttpRequestCallback?];

function resolveRequestOptions(
  args: ClientRequestArgs,
  url: URL
): RequestOptions {
  // Calling `fetch` provides only URL to `ClientRequest`
  // without any `RequestOptions` or callback.
  if (typeof args[1] === 'undefined' || typeof args[1] === 'function') {
    return getRequestOptionsByUrl(url);
  }

  if (args[1]) {
    const requestOptionsFromUrl = getRequestOptionsByUrl(url);

    /**
     * Clone the request options to lock their state
     * at the moment they are provided to `ClientRequest`.
     * @see https://github.com/mswjs/interceptors/issues/86
     */
    const clonedRequestOptions = cloneObject(args[1]);

    return {
      ...requestOptionsFromUrl,
      ...clonedRequestOptions
    };
  }

  return {} as RequestOptions;
}

/**
 * Overrides the given `URL` instance with the explicit properties provided
 * on the `RequestOptions` object. The options object takes precedence,
 * and will replace URL properties like "host", "path", and "port", if specified.
 */
function overrideUrlByRequestOptions(url: URL, options: RequestOptions): URL {
  url.host = options.host || url.host;
  url.hostname = options.hostname || url.hostname;
  url.port = options.port ? options.port.toString() : url.port;

  if (options.path) {
    const parsedOptionsPath = parseUrl(options.path, false);
    url.pathname = parsedOptionsPath.pathname || '';
    url.search = parsedOptionsPath.search || '';
  }

  return url;
}

function resolveCallback(
  args: ClientRequestArgs
): HttpRequestCallback | undefined {
  return typeof args[1] === 'function' ? args[1] : args[2];
}

export type NormalizedClientRequestArgs = [
  url: URL,
  options: ResolvedRequestOptions,
  callback?: HttpRequestCallback
];

/**
 * Normalizes parameters given to a `http.request` call
 * so it always has a `URL` and `RequestOptions`.
 */
export function normalizeClientRequestArgs(
  defaultProtocol: string,
  ...args: ClientRequestArgs
): NormalizedClientRequestArgs {
  let url: URL;
  let options: ResolvedRequestOptions;
  let callback: HttpRequestCallback | undefined;

  // Support "http.request()" calls without any arguments.
  // That call results in a "GET http://localhost" request.
  if (args.length === 0) {
    const url = new URL('http://localhost');
    const options = resolveRequestOptions(args, url);
    return [url, options];
  }

  // Convert a url string into a URL instance
  // and derive request options from it.
  if (typeof args[0] === 'string') {
    url = new URL(args[0]);
    options = resolveRequestOptions(args, url);
    callback = resolveCallback(args);
  }
  // Handle a given URL instance as-is
  // and derive request options from it.
  else if (args[0] instanceof URL) {
    url = args[0];
    // Check if the second provided argument is RequestOptions.
    // If it is, check if "options.path" was set and rewrite it
    // on the input URL.
    // Do this before resolving options from the URL below
    // to prevent query string from being duplicated in the path.
    if (typeof args[1] !== 'undefined' && isObject<RequestOptions>(args[1])) {
      url = overrideUrlByRequestOptions(url, args[1]);
    }

    options = resolveRequestOptions(args, url);
    callback = resolveCallback(args);
  }
  // Handle a legacy URL instance and re-normalize from either a RequestOptions object
  // or a WHATWG URL.
  else if ('hash' in args[0] && !('method' in args[0])) {
    const [legacyUrl] = args;
    if (legacyUrl.hostname === null) {
      /**
       * We are dealing with a relative url, so use the path as an "option" and
       * merge in any existing options, giving priority to exising options -- i.e. a path in any
       * existing options will take precedence over the one contained in the url. This is consistent
       * with the behaviour in ClientRequest.
       * @see https://github.com/nodejs/node/blob/d84f1312915fe45fe0febe888db692c74894c382/lib/_http_client.js#L122
       */
      return isObject(args[1])
        ? normalizeClientRequestArgs(
            defaultProtocol,
            { path: legacyUrl.path, ...args[1] },
            args[2]
          )
        : normalizeClientRequestArgs(
            defaultProtocol,
            { path: legacyUrl.path },
            args[1] as HttpRequestCallback
          );
    }
    // We are dealing with an absolute URL, so convert to WHATWG and try again.
    const resolvedUrl = new URL(legacyUrl.href);

    return args[1] === undefined
      ? normalizeClientRequestArgs(defaultProtocol, resolvedUrl)
      : typeof args[1] === 'function'
      ? normalizeClientRequestArgs(defaultProtocol, resolvedUrl, args[1])
      : normalizeClientRequestArgs(
          defaultProtocol,
          resolvedUrl,
          args[1],
          args[2]
        );
  }
  // Handle a given "RequestOptions" object as-is
  // and derive the URL instance from it.
  else if (isObject(args[0])) {
    options = args[0] as any;
    // When handling a "RequestOptions" object without an explicit "protocol",
    // infer the protocol from the request issuing module (http/https).
    options.protocol = options.protocol || defaultProtocol;
    url = getUrlByRequestOptions(options);

    callback = resolveCallback(args);
  } else {
    throw new Error(
      `Failed to construct ClientRequest with these parameters: ${args}`
    );
  }

  options.protocol = options.protocol || url.protocol;
  options.method = options.method || 'GET';

  /**
   * Infer a fallback agent from the URL protocol.
   * The interception is done on the "ClientRequest" level ("NodeClientRequest")
   * and it may miss the correct agent. Always align the agent
   * with the URL protocol, if not provided.
   *
   * @note Respect the "agent: false" value.
   */
  if (typeof options.agent === 'undefined') {
    const agent =
      options.protocol === 'https:'
        ? new HttpsAgent({
            rejectUnauthorized: options.rejectUnauthorized
          })
        : new HttpAgent();

    options.agent = agent;
  }

  /**
   * Ensure that the default Agent is always set.
   * This prevents the protocol mismatch for requests with { agent: false },
   * where the global Agent is inferred.
   * @see https://github.com/mswjs/msw/issues/1150
   * @see https://github.com/nodejs/node/blob/418ff70b810f0e7112d48baaa72932a56cfa213b/lib/_http_client.js#L130
   * @see https://github.com/nodejs/node/blob/418ff70b810f0e7112d48baaa72932a56cfa213b/lib/_http_client.js#L157-L159
   */
  if (!options._defaultAgent) {
    options._defaultAgent =
      options.protocol === 'https:' ? httpsGlobalAgent : httpGlobalAgent;
  }

  return [url, options, callback];
}
