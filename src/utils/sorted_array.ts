// Copyright 2023 Im-Beast. All rights reserved. MIT license.

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
    for (const item of items) {
      this.splice(this.indexOf(item), 1);
    }
    return this.length;
  }
}
