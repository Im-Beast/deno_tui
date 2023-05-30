import { optimizeDependencies, trackDependencies } from "./dependency_tracking.ts";
import type { Dependant, Dependency } from "./types.ts";

export interface Effectable {
  (): void;
}

export class Effect implements Dependant {
  update: Effectable;
  dependencies: Set<Dependency>;

  constructor(effectable: Effectable) {
    this.update = effectable;
    this.dependencies = new Set();

    trackDependencies(this.dependencies, this, effectable).then(() => {
      optimizeDependencies(this.dependencies);

      for (const dependency of this.dependencies) {
        dependency.depend(this);
      }
    });
  }

  dispose(): void {
    const { dependencies } = this;
    for (const dependency of dependencies) {
      dependency.dependants!.delete(this);
      dependencies.delete(dependency);
    }
  }
}
