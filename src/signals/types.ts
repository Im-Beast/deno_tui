export interface Subscription<T> {
  (current: T): void;
}

export interface Dependency {
  depend(dependant: Dependant): void;
  dependants?: Set<Dependant>;
}

export interface Dependant {
  dependencies: Set<Dependency>;
  dispose(): void;
  update(): void;
}
