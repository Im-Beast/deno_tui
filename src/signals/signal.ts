// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { activeSignals } from "./dependency_tracking.ts";
import { makeMapMethodsReactive, makeObjectPropertiesReactive, makeSetMethodsReactive } from "./reactivity.ts";
import { Dependant, Dependency, Subscription } from "./types.ts";

// TODO: Make dispose revert reactive value modifications

/** Thrown whenever `deepObserve` is set and `typeof value !== "object"` */
export class SignalDeepObserveTypeofError extends Error {
  constructor() {
    super("You can only deeply observe value with typeof 'object'");
  }
}

export interface SignalOptions<T> {
  /**
   * @requires T to be `typeof 'object'`
   *
   * Whether to deeply observe object a.k.a. whether to watch changes in its properties.
   */
  deepObserve?: boolean;
  /**
   * @requires T to be `typeof 'object'`
   *
   * Changes the way `deepObserve` affects objects.
   *
   *  - When set to `true` it creates `Proxy` which watches properties, even new ones.
   *  - When set to `false` it uses `Object.defineProperty` to watch properties that existed at the time of creating signal.
   */
  watchObjectIndex?: T extends Map<unknown, unknown> | Set<unknown> ? never : boolean;
  /**
   * @requires T to be `instanceof Map`
   *
   * Changes method of detecting value changes when `.set()` gets called.
   *
   *  - When set to `true` it checks whether value changed.
   *  - When set to `false` it checks whether map size changed (default).
   */
  watchMapUpdates?: T extends Map<unknown, unknown> ? boolean : never;
}

/**
 * Signal wraps value in a container.
 *
 * Each time you set the value it analyzes whether it changed and propagates update over all of its dependants.
 *
 * @example
 * ```ts
 * const number = new Signal(0);
 * number.value++;
 * console.log(number.value); // 1
 * ```
 */
export class Signal<T> implements Dependency {
  protected $value: T;

  // Dependant: something that depends on THIS
  dependants?: Set<Dependant>;
  subscriptions?: Set<Subscription<T>>;

  forceUpdateValue?: boolean;

  constructor(value: T, options?: SignalOptions<T>) {
    if (options?.deepObserve) {
      if (typeof value !== "object") throw new SignalDeepObserveTypeofError();

      if (value instanceof Set) {
        value = makeSetMethodsReactive(value, this);
      } else if (value instanceof Map) {
        value = makeMapMethodsReactive(value, this, options.watchMapUpdates);
      } else {
        value = makeObjectPropertiesReactive(value, this, options.watchObjectIndex);
      }
    }
    this.$value = value;
  }

  /** Bind function to signal, it'll be called each time signal's value changes with current value as argument */
  subscribe(subscription: Subscription<T>): void {
    this.subscriptions ??= new Set();
    this.subscriptions.add(subscription);
  }

  /** Add `dependant` to signal `dependants` */
  depend(dependant: Dependant): void {
    this.dependants ??= new Set();
    this.dependants.add(dependant);
  }

  /**
   * - Run all linked subscriptions
   * - Update each dependant in `dependants`
   */
  propagate(): void {
    const { subscriptions, dependants } = this;

    if (subscriptions?.size) {
      const value = this.$value;
      for (const callback of subscriptions) {
        callback(value);
      }
    }

    if (!dependants?.size) return;

    for (const dependant of dependants) {
      if ("forceUpdateValue" in dependant) {
        dependant.forceUpdateValue = true;
      }
      dependant.update();
    }
  }

  /**
   * - Overwrites signal's `value` getter with current value
   * - Removes all subscriptions
   * - Removes itself from all dependants dependencies
   * - If any of the dependant doesn't have any other dependencies it gets disposed
   * - Clears dependants
   */
  dispose(): void {
    Object.defineProperty(this, "value", {
      value: this.$value,
    });

    const { dependants, subscriptions } = this;

    subscriptions?.clear();

    if (!dependants) return;
    for (const dependant of dependants) {
      dependants.delete(dependant);
      dependant.dependencies.delete(this);

      // If dependant has no more dependencies then
      // it means that it should be replaced with constant value,
      // because nothing can update its value anymore
      if (!dependant.dependencies) {
        dependant.dispose();
      }
    }
  }

  get value(): T {
    activeSignals?.add(this);
    return this.$value;
  }

  set value(value) {
    activeSignals?.add(this);

    if (this.$value !== (this.$value = value) || this.forceUpdateValue) {
      this.propagate();
    }
  }

  /** Gets signals value without being appended as dependency */
  peek(): T {
    return this.$value;
  }

  /** Sets signals value without being appended as dependency */
  jink(value: T): void {
    this.$value = value;
  }

  valueOf(): T {
    return this.$value;
  }

  toString(): string {
    return `${this.$value}`;
  }
}
