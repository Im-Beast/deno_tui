// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Signal } from "./signal.ts";
import type { Dependant, Dependency } from "./types.ts";

import { activeSignals, trackDependencies } from "./dependency_tracking.ts";

/** Thrown whenever someone tries to directly modify `Computed.value` */
export class ComputedReadOnlyError extends Error {
  constructor() {
    super("Computed is read-only, you can't (and shouldn't!) directly modify its value");
  }
}

/** Function that's used to calculate `Computed`'s value */
export interface Computable<T> {
  (): T;
}

/**
 * Computed is a type of signal that depends on other signals and updates when any of them changes
 *
 * @example
 * ```ts
 * const multiplicand = new Signal(1);
 * const multiplier = new Signal(2);
 * const product = new Computed(() => multiplicand.value * multiplier.value);
 *
 * console.log(product.value); // 2
 * await Promise.resolve(); // Dependency tracking is asynchronous read more in `dependency_tracking.ts`
 *
 * multiplicand.value = 2;
 * console.log(product.value); // 4
 * multiplier.value = 7;
 * console.log(product.value); // 14
 * ```
 */
export class Computed<T> extends Signal<T> implements Dependant, Dependency {
  computable: Computable<T>;
  dependencies: Set<Dependency>;

  constructor(computable: Computable<T>) {
    const value = computable();
    super(value);

    this.computable = computable;
    this.dependencies = new Set();

    trackDependencies(this.dependencies, this, computable).then(() => {
      for (const dependency of this.dependencies) {
        dependency.depend(this);
      }
    });
  }

  get value(): T {
    activeSignals?.add(this);
    return this.$value;
  }

  set value(_value: T) {
    throw new ComputedReadOnlyError();
  }

  jink(_value: T): never {
    throw new ComputedReadOnlyError();
  }

  update(): void {
    activeSignals?.add(this);

    if (this.$value !== (this.$value = this.computable()) || this.forceUpdateValue) {
      this.propagate();
    }
  }

  dispose(): void {
    super.dispose();

    const { dependencies } = this;
    for (const dependency of dependencies) {
      dependency.dependants!.delete(this);
      dependencies.delete(dependency);
    }
  }
}
