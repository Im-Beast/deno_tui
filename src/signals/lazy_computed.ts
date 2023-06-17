// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Computable, Computed } from "./computed.ts";

// TODO: Tests

/**
 * Computed is a type of signal that depends on other signals and updates when any of them changes
 *
 * If time between updates is smaller than given interval it gets delayed.
 *
 * @example
 * ```ts
 * const multiplicand = new Signal(1);
 * const multiplier = new Signal(2);
 * const product = new LazyComputed(() => multiplicand.value * multiplier.value, 16);
 *
 * console.log(product.value); // 2
 * await Promise.resolve(); // Dependency tracking is asynchronous read more in `dependency_tracking.ts`
 *
 * multiplicand.value = 2;
 * console.log(product.value); // 2
 * multiplier.value = 7;
 * console.log(product.value); // 2
 *
 * setTimeout(() => {
 *  console.log(product.value); // 14
 * }, 16)
 * ```
 */
export class LazyComputed<T> extends Computed<T> {
  timeout?: number;
  interval: number;
  lastFired: number;

  #updateCallback: () => void;

  constructor(computable: Computable<T>, interval: number) {
    super(computable);

    this.interval = interval;
    this.lastFired = performance.now();
    this.#updateCallback = () => this.update();
  }

  update(): void {
    const timeDifference = performance.now() - this.lastFired;
    if (timeDifference < this.interval) {
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(this.#updateCallback, timeDifference);
    } else {
      super.update();
      this.lastFired = performance.now();
    }
  }
}
