/// <reference types="node" />
import { Headers } from 'headers-polyfill';
import { IncomingMessage, IncomingHttpHeaders } from 'http';
export declare function getIncomingMessageBody(response: IncomingMessage): Promise<string>;
export declare function createHeadersFromIncomingHttpHeaders(httpHeaders: IncomingHttpHeaders): Headers;
