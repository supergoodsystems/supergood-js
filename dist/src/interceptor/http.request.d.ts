import { ClientRequest } from 'http';
import { NodeClientOptions, Protocol } from './NodeClientRequest';
import { ClientRequestArgs } from './utils/request-args';
export declare function request(protocol: Protocol, options: NodeClientOptions): (...args: ClientRequestArgs) => ClientRequest;
