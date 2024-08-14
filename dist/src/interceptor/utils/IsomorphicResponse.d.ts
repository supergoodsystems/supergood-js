/// <reference types="node" />
import { Headers } from 'headers-polyfill';
import { IncomingMessage } from 'http';
export declare class IsomorphicResponse {
    readonly status: number;
    readonly statusText: string;
    readonly headers: Headers;
    readonly body: string;
    constructor(status: number, statusText: string, headers: Headers, body: string);
    static fromIncomingMessage(message: IncomingMessage): Promise<IsomorphicResponse>;
    static fromFetchResponse(response: Response): Promise<IsomorphicResponse>;
}
