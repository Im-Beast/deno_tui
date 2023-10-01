// Copyright 2023 Im-Beast. MIT license.
import { Computable, Computed } from "./computed.ts";
import { Dependency } from "./types.ts";
import { Flusher } from "./flusher.ts";

import type { LazyDependant } from "./types.ts";

// TODO: Tests

interface LazyComputedOptions {
  interval: number;
  flusher: Flusher;
}

/**
 * LazyComputed is a type of signal that depends on other signals and updates when any of them changes
 * - If time between updates is smaller than given interval it gets delayed
 * - If given `Flusher` instead, it will update after `Flusher.flush()` gets called
 * - Both interval and `Flusher` might be set at the same time.
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
export class LazyComputed<T> extends Computed<T> implements LazyDependant {
  timeout?: number;
  interval?: number;
  flusher?: Flusher;
  #updateCallback?: () => void;

  lastFired: number;

  constructor(computable: Computable<T>, interval: number);
  constructor(computable: Computable<T>, flusher: Flusher);
  constructor(computable: Computable<T>, options: LazyComputedOptions);
  constructor(computable: Computable<T>, option: LazyComputedOptions | number | Flusher) {
    super(computable);

    if (option instanceof Flusher) {
      this.flusher = option;
    } else if (typeof option === "object") {
      this.flusher = option.flusher;
      this.interval = option.interval;
      this.#updateCallback = () => this.update(this);
    } else {
      this.interval = option;
      this.#updateCallback = () => this.update(this);
    }

    this.lastFired = performance.now();
  }

  update(cause: Dependency): void {
    const { flusher, interval } = this;

    if (cause === this.flusher) {
      super.update(cause);
      this.lastFired = performance.now();
      return;
    }

    if (flusher) {
      flusher.depend(this);
    }

    if (interval) {
      const timeDifference = performance.now() - this.lastFired;
      if (timeDifference < interval) {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(this.#updateCallback!, timeDifference);
      } else {
        super.update(cause);
        this.lastFired = performance.now();
      }
    }
  }
}
