// Copyright 2023 Im-Beast. MIT license.
import { Effect, Effectable } from "./effect.ts";
import { Flusher } from "./flusher.ts";

import type { Dependant, Dependency, LazyDependant } from "./types.ts";

// TODO: Tests

interface LazyEffectOptions {
  interval: number;
  flusher: Flusher;
}

/**
 * LazyEffect is an container for callback function, which runs every time any of its dependencies get updated.
 * When initialized that functions gets ran and all dependencies for it are tracked.
 * - If time between updates is smaller than given interval it gets delayed
 * - If given `Flusher` instead, it will update after `Flusher.flush()` gets called
 * - Both interval and `Flusher` might be set at the same time.
 *
 * @example
 * ```ts
 * const name = new Signal("Jonathan");
 * const lazyEffect = new LazyEffect(() => {
 *  console.log("Your name is", name.value)
 * }, 16);
 * // printed: "Your name is Jonathan"
 *
 * await Promise.resolve(); // Dependency tracking is asynchronous read more in `dependency_tracking.ts`
 *
 * name.value = "Brian";
 * name.value = "Gabriel";
 * name.value = "Matthew";
 * // printed: "Your name is Matthew" after 16ms
 * ```
 */
export class LazyEffect extends Effect implements LazyDependant {
  timeout?: number;
  interval?: number;
  flusher?: Flusher;
  #updateCallback?: () => void;

  lastFired: number;

  constructor(effectable: Effectable, interval: number);
  constructor(effectable: Effectable, flusher: Flusher);
  constructor(effectable: Effectable, options: LazyEffectOptions);
  constructor(effectable: Effectable, option: LazyEffectOptions | number | Flusher) {
    super(effectable);

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

    [].slice();
    this.lastFired = performance.now();
  }

  update(cause: Dependency | Dependant): void {
    const { flusher, interval } = this;

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
