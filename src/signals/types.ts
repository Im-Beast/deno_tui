// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Flusher } from "./flusher.ts";

/** Type describing function that gets called each time signal changes */
export interface Subscription<T> {
  (current: T): void;
}

/** Element which can be a root Signal, doesn't need to depend on anything */
export interface Dependency {
  /** Attach dependant to this Dependency */
  depend(dependant: Dependant): void;
  /** All dependants that rely on this Dependency */
  dependants?: Set<Dependant>;
}

/** Element which relies on dependencies to function */
export interface Dependant {
  /** Set of all dependencies Dependant relies on */
  dependencies: Set<Dependency>;
  /** Destroy dependant, clear its dependencies */
  dispose(): void;
  /** Method which updates Dependants state/value */
  update(cause: Dependency | Dependant): void;
}

/** Element which relies on dependencies to function and updates either after specified interval or when flusher gets flushed */
export interface LazyDependant extends Dependant {
  timeout?: number;
  interval?: number;
  flusher?: Flusher;
  lastFired: number;
}
