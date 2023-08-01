// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { optimizeDependencies, trackDependencies } from "./dependency_tracking.ts";
import type { Dependant, Dependency } from "./types.ts";

/** Function that's ran every time `Effect.update` is called */
export interface Effectable {
  (cause: Dependency | Dependant): void;
}

/**
 * Effect is an container for callback function, which runs every time any of its dependencies get updated.
 *
 * When initialized that functions gets ran and all dependencies for it are tracked.
 *
 * @example
 * ```ts
 * const name = new Signal("Jonathan");
 * const effect = new Effect(() => {
 *  console.log("Your name is", name.value);
 * });
 * // printed: "Your name is Jonathan"
 *
 * await Promise.resolve(); // Dependency tracking is asynchronous read more in `dependency_tracking.ts`
 *
 * name.value = "Brian";
 * // printed: "Your name is Brian"
 * ```
 */
export class Effect implements Dependant {
  protected $effectable: Effectable;

  dependencies: Set<Dependency>;
  paused: boolean;

  constructor(effectable: Effectable) {
    this.$effectable = effectable;
    this.dependencies = new Set();
    this.paused = false;

    trackDependencies(this.dependencies, this, effectable).then(() => {
      // Remove self from dependencies dependants, because they might've tracked this effect as dependency
      // However we use their roots (optimized dependencies) to track changes
      for (const dependency of this.dependencies) {
        dependency.dependants?.delete(this);
      }

      optimizeDependencies(this.dependencies);

      // Pause might happen before dependencies get tracked, because tracking is asynchronous
      if (!this.paused) {
        for (const dependency of this.dependencies) {
          dependency.depend(this);
        }
      }
    });
  }

  update(cause: Dependency | Dependant): void {
    if (this.paused) {
      throw "Something called update() on effect while being paused";
    }

    this.$effectable(cause);
  }

  /**
   * - Removes itself from all dependencies dependants
   * - Clears dependencies
   */
  dispose(): void {
    const { dependencies } = this;
    for (const dependency of dependencies) {
      dependency.dependants!.delete(this);
    }
    dependencies.clear();
  }

  /**
   * - Removes itself from all dependencies dependants
   * - Doesn't clear dependencies, can be resumed!
   */
  pause(): void {
    this.paused = true;

    for (const dependency of this.dependencies) {
      dependency.dependants?.delete(this);
    }
  }

  /**
   * - Adds itself to all dependencies dependants
   */
  resume(): void {
    this.paused = false;

    for (const dependency of this.dependencies) {
      dependency.depend(this);
    }
  }
}
