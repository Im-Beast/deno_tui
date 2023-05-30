import type { Dependant, Dependency } from "./types.ts";

export let activeSignals: Set<Dependency> | undefined;
let incoming = 0;

export async function trackDependencies(
  dependencies: Set<Dependency>,
  thisArg: unknown,
  func: () => unknown,
): Promise<void> {
  while (incoming !== 0) {
    await Promise.resolve();
  }

  ++incoming;
  activeSignals = dependencies;
  func.call(thisArg);
  activeSignals = undefined;
  --incoming;
}

export function optimizeDependencies(into: Set<Dependency | (Dependency & Dependant)>, from = into): void {
  for (const dependency of from) {
    if ("dependencies" in dependency) {
      into.delete(dependency);
      optimizeDependencies(into, dependency.dependencies);
    } else {
      into.add(dependency);
    }
  }
}
