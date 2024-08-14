/// <reference types="node" />
export type ClientRequestWriteCallback = (error?: Error | null) => void;
export type ClientRequestWriteArgs = [
    chunk: string | Buffer,
    encoding?: BufferEncoding | ClientRequestWriteCallback,
    callback?: ClientRequestWriteCallback
];
export type NormalizedClientRequestWriteArgs = [
    chunk: string | Buffer,
    encoding?: BufferEncoding,
    callback?: ClientRequestWriteCallback
];
export declare function normalizeClientRequestWriteArgs(args: ClientRequestWriteArgs): NormalizedClientRequestWriteArgs;
