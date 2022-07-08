export enum Timing {
  Pre = "pre",
  Post = "post",
}

export function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export function clamp(number: number, min: number, max: number): number {
  return Math.max(Math.min(number, max), min);
}

export class TypedCustomEvent<
  Event = string,
  EventInit = unknown,
> extends CustomEvent {
  declare detail: EventInit;

  constructor(typeArg: Event, eventInitDict?: CustomEventInit<EventInit>) {
    super(typeArg as unknown as string, eventInitDict);
  }
}

export class TypedEventTarget<
  EventMap extends Record<string, unknown>,
> {
  #eventTarget: EventTarget;

  constructor() {
    this.#eventTarget = new EventTarget();
  }

  addEventListener<EventType extends keyof EventMap>(
    type: EventType,
    listener: (
      ev: TypedCustomEvent<EventType, EventMap[EventType]>,
    ) => void | Promise<void>,
    options?: boolean | AddEventListenerOptions,
  ): void {
    return this.#eventTarget.addEventListener(
      type as string,
      listener as EventListener,
      options,
    );
  }

  dispatchEvent<EventType extends keyof EventMap>(
    event: TypedCustomEvent<EventType, EventMap[EventType]>,
  ): boolean {
    return this.#eventTarget.dispatchEvent(event);
  }

  removeEventListener<EventType extends keyof EventMap>(
    type: EventType,
    listener: (ev: TypedCustomEvent<EventType, EventMap[EventType]>) => void,
    options?: boolean | EventListenerOptions | undefined,
  ): void {
    return this.#eventTarget.removeEventListener(
      type as string,
      listener as EventListener,
      options,
    );
  }
}

export type CompareFn<T> = (a: T, b: T) => number;

export class SortedArray<T = unknown> extends Array<T> {
  compareFn: CompareFn<T>;

  constructor(compareFn: CompareFn<T>, ...items: T[]) {
    super(...items);
    this.compareFn = compareFn;
  }

  push(...items: T[]) {
    super.push(...items);
    this.sort(this.compareFn);
    return this.length;
  }

  remove(...items: T[]) {
    const filtered = this.filter((item) => !items.includes(item));
    this.length = 0;
    this.push(...filtered);
    return this.length;
  }
}

export class CombinedAsyncIterator<T = unknown> {
  #asyncIterators: AsyncIterator<T>[] = [];

  constructor(...iterables: AsyncIterable<T>[]) {
    this.#asyncIterators.push(
      ...(iterables.map((x) => x[Symbol.asyncIterator]())),
    );
  }

  async *iterate(): AsyncIterableIterator<T> {
    const yields: T[] = [];
    const throws: unknown[] = [];
    let resolve: () => void;
    let promise = new Promise<void>((r) => {
      resolve = r;
    });
    while (true) {
      if (!yields.length) {
        for (const iterator of this.#asyncIterators) {
          const next = iterator.next();

          next.catch(throws.push);

          next.then(({ done, value }) => {
            if (done) {
              this.#asyncIterators.splice(
                this.#asyncIterators.indexOf(iterator),
                1,
              );
            } else {
              yields.push(value);
              resolve();
            }
          });
        }

        await promise;
      }

      for (const reason of throws) {
        throw reason;
      }

      for (const value of yields) {
        yield value;
      }
      yields.length = 0;

      promise = new Promise<void>((r) => {
        resolve = r;
      });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.iterate();
  }
}
