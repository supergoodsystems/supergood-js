import { Interceptor } from './Interceptor';

/**
 * A batch interceptor that exposes a single interface
 * to apply and operate with multiple interceptors at once.
 */
export class BatchInterceptor {
  private interceptors: Interceptor[];
  private subscriptions: Array<() => void> = [];

  constructor(interceptors: Interceptor[]) {
    this.interceptors = interceptors;
  }

  public setup() {
    for (const interceptor of this.interceptors) {
      interceptor.setup();

      this.subscriptions.push(() => interceptor.teardown());
    }
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    for (const interceptor of this.interceptors) {
      interceptor.on(event, listener);
    }
  }

  public teardown() {
    for (const unsubscribe of this.subscriptions) {
      unsubscribe();
    }
  }
}
