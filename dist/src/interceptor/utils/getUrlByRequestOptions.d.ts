/// <reference types="node" />
import { RequestOptions } from 'https';
export interface RequestSelf {
    uri?: URL;
}
export type ResolvedRequestOptions = RequestOptions & RequestSelf;
export declare const DEFAULT_PATH = "/";
export declare function getUrlByRequestOptions(options: ResolvedRequestOptions): URL;
