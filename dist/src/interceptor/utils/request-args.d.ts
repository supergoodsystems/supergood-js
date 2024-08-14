/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { IncomingMessage } from 'http';
import { RequestOptions } from 'https';
import { Url as LegacyURL } from 'url';
import { ResolvedRequestOptions } from './getUrlByRequestOptions';
export type HttpRequestCallback = (response: IncomingMessage) => void;
export type ClientRequestArgs = [] | [string | URL | LegacyURL, HttpRequestCallback?] | [string | URL | LegacyURL, RequestOptions, HttpRequestCallback?] | [RequestOptions, HttpRequestCallback?];
export type NormalizedClientRequestArgs = [
    url: URL,
    options: ResolvedRequestOptions,
    callback?: HttpRequestCallback
];
export declare function normalizeClientRequestArgs(defaultProtocol: string, ...args: ClientRequestArgs): NormalizedClientRequestArgs;
