import { ClientRequest } from 'node:http';
import { NodeClientOptions, Protocol } from './NodeClientRequest';
import { ClientRequestArgs } from './utils/request-args';
export declare function get(protocol: Protocol, options: NodeClientOptions): (...args: ClientRequestArgs) => ClientRequest;
