// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { activeSignals } from "./dependency_tracking.ts";
import { makeMapMethodsReactive, makeObjectPropertiesReactive, makeSetMethodsReactive } from "./reactivity.ts";
import { Dependant, Dependency, Subscription } from "./types.ts";

// TODO: Make dispose revert reactive value modifications

export interface SignalOptions<T> {
  deepObserve?: boolean;
  watchMapUpdates?: T extends Map<unknown, unknown> ? boolean : never;
  watchObjectIndex?: T extends Map<unknown, unknown> | Set<unknown> ? never : boolean;
}

export class Signal<T> implements Dependency {
  protected $value: T;

  // Dependant: something that depends on THIS
  dependants?: Set<Dependant>;
  subscriptions?: Set<Subscription<T>>;

  forceUpdateValue?: boolean;

  constructor(value: T, options?: SignalOptions<T>) {
    if (options?.deepObserve) {
      if (typeof value !== "object") throw new Error("You can only deeply observe value with typeof 'object'");

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

  subscribe(subscription: Subscription<T>): void {
    this.subscriptions ??= new Set();
    this.subscriptions.add(subscription);
  }

  depend(dependant: Dependant): void {
    this.dependants ??= new Set();
    this.dependants.add(dependant);
  }

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

  peek(): T {
    return this.$value;
  }

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
