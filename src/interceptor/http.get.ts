import { ClientRequest } from 'node:http'
import http from 'http';
import https from 'https';

import {
  NodeClientOptions,
  NodeClientRequest,
  Protocol,
} from './NodeClientRequest'
import {
  ClientRequestArgs,
  normalizeClientRequestArgs,
} from './utils/request-args'

export function get(protocol: Protocol, options: NodeClientOptions) {
  return function interceptorsHttpGet(
    ...args: ClientRequestArgs
  ): ClientRequest {
    const clientRequestArgs = normalizeClientRequestArgs(
      `${protocol}:`,
      ...args
    )
    const request = new NodeClientRequest(clientRequestArgs, options)

    /**
     * @note https://nodejs.org/api/http.html#httpgetoptions-callback
     * "http.get" sets the method to "GET" and calls "req.end()" automatically.
     */
    request.end()

    return request
  }
}
