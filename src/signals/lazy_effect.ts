// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Effect, Effectable } from "./effect.ts";

// TODO: Tests

/**
 * LazyEffect is an container for callback function, which runs every time any of its dependencies get updated.
 *
 * When initialized that functions gets ran and all dependencies for it are tracked.
 *
 * If time between updates is smaller than given interval it gets delayed.
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
export class LazyEffect extends Effect {
  timeout?: number;
  interval: number;
  lastFired: number;

  #updateCallback: () => void;

  constructor(effectable: Effectable, interval: number) {
    super(effectable);

    this.interval = interval;
    this.lastFired = performance.now();
    this.#updateCallback = () => this.update();
  }

  update() {
    const timeDifference = performance.now() - this.lastFired;
    if (timeDifference < this.interval) {
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(this.#updateCallback, timeDifference);
    } else {
      this.$effectable();
      this.lastFired = performance.now();
    }
  }
}
