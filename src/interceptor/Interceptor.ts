import { EventEmitter } from 'events';

export interface NodeRequestInterceptorOptions {
  ignoredDomains?: string[];
  allowLocalUrls?: boolean;
  allowIpAddresses?: boolean;
  baseUrl?: string;
}

export class Interceptor {
  protected emitter: EventEmitter;
  protected options: NodeRequestInterceptorOptions;
  protected subscriptions: Array<() => void> = [];

  constructor(options?: NodeRequestInterceptorOptions) {
    this.emitter = new EventEmitter();
    this.options = options ?? {};
  }

  public setup(): void {
    throw new Error('Not implemented');
  }

  public teardown(): void {
    for (const unsubscribe of this.subscriptions) {
      unsubscribe();
    }
    this.emitter.removeAllListeners();
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  public static checkEnvironment() {
    return true;
  }
}
