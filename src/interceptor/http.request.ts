import { ClientRequest } from 'http';
import {
  NodeClientOptions,
  NodeClientRequest,
  Protocol
} from './NodeClientRequest';
import {
  normalizeClientRequestArgs,
  ClientRequestArgs
} from './utils/request-args';

export function request(protocol: Protocol, options: NodeClientOptions) {
  return function interceptorsHttpRequest(
    ...args: ClientRequestArgs
  ): ClientRequest {
    const clientRequestArgs = normalizeClientRequestArgs(
      `${protocol}:`,
      ...args
    );
    return new NodeClientRequest(clientRequestArgs, options);
  };
}
