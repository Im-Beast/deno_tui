// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Signal } from "./signal.ts";
import type { Dependant, Dependency } from "./types.ts";

import { activeSignals, trackDependencies } from "./dependency_tracking.ts";

export interface Computable<T> {
  (): T;
}

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
