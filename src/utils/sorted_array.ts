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
