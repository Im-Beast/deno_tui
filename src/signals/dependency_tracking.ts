// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import type { Dependant, Dependency } from "./types.ts";

export let activeSignals: Set<Dependency> | undefined;
let incoming = 0;

/**
 * Asynchronously tracks used signals for provided function
 */
export async function trackDependencies(
  dependencies: Set<Dependency>,
  thisArg: unknown,
  // this is supposed to mean every function
  // deno-lint-ignore ban-types
  func: Function,
): Promise<void> {
  while (incoming !== 0) {
    await Promise.resolve();
  }

  ++incoming;
  activeSignals = dependencies;
  try {
    func.call(thisArg);
  } catch (error) {
    incoming = 0;
    throw error;
  }
  activeSignals = undefined;
  --incoming;
}

/**
 * Replaces all dependencies with root dependencies to prevent multiple updates caused by the same change.
 */
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
