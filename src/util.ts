export enum Timing {
  Pre = "pre",
  Post = "post",
}

export const textEncoder = new TextEncoder();

export function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export function clamp(number: number, min: number, max: number): number {
  return Math.max(Math.min(number, max), min);
}

export function fits(number: number, min: number, max: number): boolean {
  return number === clamp(number, min, max);
}

export function insertAt(string: string, index: number, value: string): string {
  return string.slice(0, index) + value + string.slice(index);
}

export function normalize(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) || 0;
}

export type EventRecord = Record<string, Event>;

export class TypedEventTarget<EventMap extends EventRecord> {
  eventTarget: EventTarget;

  constructor() {
    this.eventTarget = new EventTarget();
  }

  addEventListener<Event extends keyof EventMap>(
    types: Event | Event[],
    listener: (this: TypedEventTarget<EventMap>, event: EventMap[Event]) => void | Promise<void>,
    options?: AddEventListenerOptions,
  ): void {
    types = Array.isArray(types) ? types : [types];
    for (const type of types) {
      this.eventTarget.addEventListener(type as string, listener as EventListener, options);
    }
  }

  removeEventListener<Event extends keyof EventMap>(
    types: Event | Event[],
    listener: (this: TypedEventTarget<EventMap>, event: EventMap[Event]) => void | Promise<void>,
    options?: AddEventListenerOptions,
  ): void {
    types = Array.isArray(types) ? types : [types];
    for (const type of types) {
      this.eventTarget.removeEventListener(type as string, listener as EventListener, options);
    }
  }

  dispatchEvent<EventType extends Event>(event: EventType): boolean {
    return this.eventTarget.dispatchEvent(event);
  }
}

export type CompareFn<T> = (a: T, b: T) => number;

export class SortedArray<T = unknown> extends Array<T> {
  compareFn?: CompareFn<T>;

  constructor(compareFn?: CompareFn<T>, ...items: T[]) {
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

// TODO(Im-Beast): Optimize this class
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
