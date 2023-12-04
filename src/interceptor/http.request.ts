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
import { pinoLogger } from '../logger';

const logger = pinoLogger.child({ module: 'http request' });

export function request(protocol: Protocol, options: NodeClientOptions) {
  return function interceptorsHttpRequest(
    ...args: ClientRequestArgs
  ): ClientRequest {
    logger.debug('request call (protocol "%s"):', protocol, args);

    const clientRequestArgs = normalizeClientRequestArgs(
      `${protocol}:`,
      ...args
    );
    return new NodeClientRequest(clientRequestArgs, options);
  };
}
