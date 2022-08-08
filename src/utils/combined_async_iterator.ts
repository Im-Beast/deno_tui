// Copyright 2022 Im-Beast. All rights reserved. MIT license.

/** Combines multiple async iterators into one */
export class CombinedAsyncIterator<T = unknown> {
  #asyncIterators: AsyncIterable<T>[] = [];

  constructor(...iterables: AsyncIterable<T>[]) {
    this.#asyncIterators.push(...iterables);
  }

  async *iterate(): AsyncIterableIterator<T> {
    const yields: T[] = [];
    let promise!: Promise<void>;
    let resolve!: () => void;

    const defer = () => {
      promise = new Promise((r) => {
        resolve = r;
      });
    };
    defer();

    for (const iterator of this.#asyncIterators) {
      void async function () {
        for await (const value of iterator) {
          yields.push(value);
          resolve();
        }
      }();
    }

    while (true) {
      await promise;
      defer();

      for (const value of yields) {
        yield value;
      }

      yields.length = 0;
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.iterate();
  }
}
