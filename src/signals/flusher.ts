// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { LazyComputed } from "./lazy_computed.ts";
import { Signal } from "./signal.ts";
import type { Dependant, Dependency, LazyDependant } from "./types.ts";

/**
 * Flusher tracks
 *
 * @example
 * ```ts
 * const flusher = new Flusher();
 * const multiplicand = new Signal(1);
 * const multiplier = new Signal(2);
 * const product = new LazyComputed(() => multiplicand.value * multiplier.value, flusher);
 *
 * console.log(product.value); // 2
 * await Promise.resolve(); // Dependency tracking is asynchronous read more in `dependency_tracking.ts`
 *
 * multiplicand.value  = 3;
 * console.log(product.value); // 2
 *
 * flusher.flush(); // update happens only after flusher has been flushed!
 *
 * console.log(product.value); // 6
 * ```
 */
export class Flusher implements Dependency {
  dependants: Set<Dependant>;

  constructor() {
    this.dependants = new Set();
  }

  depend(dependant: LazyDependant) {
    this.dependants.add(dependant);
  }

  flush(): void {
    const { dependants } = this;
    for (const dependant of dependants) {
      dependant.update(this);
    }
    dependants.clear();
  }
}

const flusher = new Flusher();
const multiplicand = new Signal(1);
const multiplier = new Signal(2);
const product = new LazyComputed(() => multiplicand.value * multiplier.value, flusher);

console.log(product.value); // 2
await Promise.resolve(); // Dependency tracking is asynchronous read more in `dependency_tracking.ts`

multiplicand.value = 3;
console.log(product.value); // 2

flusher.flush();

console.log(product.value); // 6
