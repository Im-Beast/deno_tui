// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { optimizeDependencies, trackDependencies } from "./dependency_tracking.ts";
import type { Dependant, Dependency } from "./types.ts";

/** Function that's ran every time `Effect.update` is called */
export interface Effectable {
  (): void;
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
 *  console.log("Your name is", name)
 * });
 * // printed: "Your name is Jonathan"
 *
 * name.value = "Brian";
 * // printed: "Your name is Brian"
 * ```
 */
export class Effect implements Dependant {
  protected $effectable: Effectable;

  dependencies: Set<Dependency>;

  constructor(effectable: Effectable) {
    this.$effectable = effectable;
    this.dependencies = new Set();

    trackDependencies(this.dependencies, this, effectable).then(() => {
      optimizeDependencies(this.dependencies);

      for (const dependency of this.dependencies) {
        dependency.depend(this);
      }
    });
  }

  update(): void {
    this.$effectable();
  }

  /**
   * - Removes itself from all dependencies dependants
   * - Clears dependencies
   */
  dispose(): void {
    const { dependencies } = this;
    for (const dependency of dependencies) {
      dependency.dependants!.delete(this);
      dependencies.delete(dependency);
    }
  }
}
