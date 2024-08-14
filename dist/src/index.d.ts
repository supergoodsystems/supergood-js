import { ConfigType, MetadataType, SupergoodContext } from './types';
declare const _default: {
    close: (force?: boolean) => Promise<boolean>;
    flushCache: ({ force }?: {
        force: boolean;
    }) => Promise<void>;
    waitAndFlushCache: ({ force }?: {
        force: boolean;
    }) => Promise<void>;
    withTags: <TRet>(options: {
        tags: Record<string, string | number | string[]>;
        trace?: string | undefined;
    }, fn: () => Promise<TRet>) => Promise<TRet>;
    init: <TConfig extends Partial<ConfigType>>({ clientId, clientSecret, config, metadata, tags, trace, isWithinContext }?: {
        clientId?: string | undefined;
        clientSecret?: string | undefined;
        config?: TConfig | undefined;
        metadata?: Partial<MetadataType> | undefined;
        tags?: Record<string, string | number | string[]> | undefined;
        trace?: string | undefined;
        isWithinContext?: (() => boolean) | undefined;
    }, baseUrl?: string, baseTelemetryUrl?: string, baseProxyURL?: string) => TConfig extends {
        useRemoteConfig: false;
    } ? void : Promise<void>;
    withCapture: <TRet_1>({ clientId, clientSecret, config, tags, trace, baseUrl, baseTelemetryUrl }: {
        clientId?: string | undefined;
        clientSecret?: string | undefined;
        config?: Partial<ConfigType> | undefined;
        tags?: Record<string, string | number | string[]> | undefined;
        trace?: string | undefined;
        baseUrl?: string | undefined;
        baseTelemetryUrl?: string | undefined;
    }, fn: () => Promise<TRet_1>) => Promise<TRet_1>;
    startCapture: ({ clientId, clientSecret, config, tags, trace, baseUrl, baseTelemetryUrl }: {
        clientId?: string | undefined;
        clientSecret?: string | undefined;
        config?: Partial<ConfigType> | undefined;
        tags?: Record<string, string | number | string[]> | undefined;
        trace?: string | undefined;
        baseUrl?: string | undefined;
        baseTelemetryUrl?: string | undefined;
    }) => Promise<void>;
    stopCapture: () => void;
    getAsyncLocalStorage: () => SupergoodContext | undefined;
};
export = _default;
