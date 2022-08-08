// Copyright 2022 Im-Beast. All rights reserved. MIT license.

export type CompareFn<T> = (a: T, b: T) => number;

/**
 * Creates array that automatically sorts elements using `compareFn`
 * Additionally allows for removing elements
 */
export class SortedArray<T = unknown> extends Array<T> {
  compareFn?: CompareFn<T>;

  constructor(compareFn?: CompareFn<T>, ...items: T[]) {
    super(...items);
    this.compareFn = compareFn;
  }

  push(...items: T[]): number {
    super.push(...items);
    this.sort(this.compareFn);
    return this.length;
  }

  remove(...items: T[]): number {
    const filtered = this.filter((item) => !items.includes(item));
    this.length = 0;
    this.push(...filtered);
    return this.length;
  }
}
