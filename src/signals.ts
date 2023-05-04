// Copyright 2023 Im-Beast. All rights reserved. MIT license.
// Inspired by Vue.js Ref and Preact's signal API's

import { sleep } from "../mod.ts";

export type SubscriptionCallback<T> = (value: T) => void;

export interface BaseSignalOptions {
  deepObserve?: boolean;
  watchArrayIndex?: boolean;
}

// deno-lint-ignore no-explicit-any
export type AnySignal = BaseSignal<any>;
export type AnyEffect = Effect<unknown>;
export type AnyDependency = AnySignal | AnyEffect;

export class BaseSignal<T> {
  dependencies: Set<AnyDependency>;
  subscriptions?: SubscriptionCallback<unknown>[];

  deepObserve: boolean;
  /*
  Only works if `deepObserve` is set to true

  If set to true watch objects and arrays using Proxy to detect changes made directly:
    - in arrays: via index e.g. `array[5] = "xyz"`
    - in objects: new properties that weren't present when `BaseSignal` was created.

  If set to false (default, more performant) changes to:
    - arrays are only detected if `push`, `splice`, `sort`, `reverse` are called.
      - this overwrites methods on main reference to array, be aware of that.
    - object properties that were present when `BaseSignal` was created.
  */
  watchObjectIndex: boolean;

  constructor(options?: BaseSignalOptions) {
    this.dependencies = new Set();
    this.deepObserve = options?.deepObserve ?? false;
    this.watchObjectIndex = options?.watchArrayIndex ?? false;
  }

  get value(): T {
    throw new Error("BaseSignal doesn't actually implement value getter!");
  }
  set value(_value: T) {
    throw new Error("BaseSignal doesn't actually  implement value setter!");
  }

  peek(): T {
    throw new Error("BaseSignal doesn't actually implement peek()!");
  }

  subscribe(callback: SubscriptionCallback<T>): void {
    (this.subscriptions ??= []).push(callback as SubscriptionCallback<unknown>);
  }

  updateDependencies(): void {
    const { dependencies, subscriptions } = this;

    if (subscriptions?.length) {
      const value = this.peek();
      for (const callback of subscriptions) {
        callback(value);
      }
    }

    if (!dependencies?.size) return;

    for (const dependency of dependencies) {
      if (dependency instanceof Effect) {
        dependency.func();
      } else if (dependency instanceof Computed) {
        dependency.update();
      }
    }
  }

  dispose(): void {
    for (const dependency of this.dependencies) {
      const isEffect = dependency instanceof Effect;
      const isComputed = dependency instanceof Computed;

      if (isEffect || isComputed) {
        const dependants = dependency.dependants;
        dependants?.delete(this);

        if (!dependants?.size && isComputed) {
          dependency.dispose();
          Object.defineProperty(dependency, "value", { value: dependency.peek() });
        }
      }
    }
  }
}

export class Signal<T> extends BaseSignal<T> {
  #value!: T;

  constructor(value: T, options?: BaseSignalOptions) {
    super(options);
    this.#value = value;
    if (this.deepObserve) {
      this.#value = makeObjectReactiveToSignal(this, this.watchObjectIndex);
    }
  }

  get value(): T {
    if (trackSignals) activeSignals.add(this);
    return this.#value;
  }

  set value(value) {
    if (trackSignals) activeSignals.add(this);

    const oldValue = this.#value;
    this.#value = value;

    if (value !== oldValue) {
      this.updateDependencies();
    }
  }

  peek(): T {
    return this.#value;
  }

  valueOf(): T {
    return this.#value;
  }

  toString(): string {
    return `${this.#value}`;
  }
}

export type ComputedFunction<T> = (this: Computed<T>, value: T) => T;

export class Computed<T> extends BaseSignal<T> {
  #value!: T;
  #updator: ComputedFunction<T>;
  dependants?: Set<AnySignal>;

  constructor(updator: ComputedFunction<T>) {
    super();
    this.#updator = updator.bind(this);
    this.update();
    this.trackDependencies();
  }

  async trackDependencies() {
    const dependants = await trackDependencies(this, this.update);
    dependants.delete(this);
    this.dependants = dependants;

    for (const signal of dependants) {
      signal.dependencies.add(this);
    }
  }

  peek(): T {
    return this.#value;
  }

  get value(): T {
    if (trackSignals) activeSignals.add(this);
    return this.#value;
  }

  update(): void {
    if (trackSignals) activeSignals.add(this);

    const oldValue = this.#value;
    this.#value = this.#updator(oldValue);

    if (this.#value !== oldValue) {
      this.updateDependencies();
    }
  }

  valueOf(): T {
    return this.#value;
  }

  toString(): string {
    return `${this.#value}`;
  }
}

export type EffectFunction<T> = (this: Effect<T>) => unknown;

export class Effect<T> {
  readonly func: EffectFunction<T>;
  dependants?: Set<BaseSignal<unknown>>;

  constructor(func: EffectFunction<T>) {
    this.func = func.bind(this);
    this.trackDependencies();
  }

  async trackDependencies() {
    this.dependants = await trackDependencies(this, this.func);
    for (const signal of this.dependants) {
      signal.dependencies.add(this);
    }
  }

  dispose(): void {
    for (const signal of this.dependants!) {
      signal.dependencies.delete(this);
    }
  }
}

export function makeObjectReactiveToSignal<T>(signal: Signal<T>, watchObjectIndex: boolean): T {
  const object = signal.peek();

  if (watchObjectIndex) {
    // deno-lint-ignore no-explicit-any
    const reactiveProxyHandler: ProxyHandler<any> = {
      get(target, property) {
        return target[property];
      },
      set(target, property, value) {
        const oldValue = target[property];
        target[property] = value;

        if (value !== oldValue) {
          signal.updateDependencies();
        }
        return true;
      },
    };

    return new Proxy(object, reactiveProxyHandler);
  } else if (Array.isArray(object)) {
    const push = Array.prototype.push.bind(object);
    object.push = function (...items) {
      const output = push(...items);
      if (items.length) {
        signal.updateDependencies();
      }
      return output;
    };

    const pop = Array.prototype.pop.bind(object);
    object.pop = function () {
      const output = pop();
      signal.updateDependencies();
      return output;
    };

    const splice = Array.prototype.splice.bind(object);
    object.splice = function (start, deleteCount) {
      const output = splice(start, deleteCount);
      if (output.length) {
        signal.updateDependencies();
      }
      return output;
    };

    const sort = Array.prototype.sort.bind(object);
    object.sort = function (compareFn) {
      const output = sort(compareFn) as T & unknown[];
      signal.updateDependencies();
      return output;
    };

    const reverse = Array.prototype.reverse.bind(object);
    object.reverse = function () {
      const output = reverse();
      signal.updateDependencies();
      return output;
    };

    return object;
  }

  const object2 = {} as T;

  for (const property in object) {
    Object.defineProperty(object2, property, {
      get() {
        return object[property];
      },
      set(value) {
        const oldValue = object[property];
        object[property] = value;

        if (value !== oldValue) {
          signal.updateDependencies();
        }
      },
    });
  }

  return object2;
}

let trackSignals = false;
let $in = 0;
let $out = 0;
// deno-lint-ignore no-explicit-any
const activeSignals = new Set<BaseSignal<any>>();
async function trackDependencies(thisArg: unknown, func: () => void) {
  while (trackSignals || $in !== $out) {
    await sleep(0);
  }

  trackSignals = true;
  ++$in;
  func.call(thisArg);
  ++$out;
  trackSignals = false;
  const active = new Set(activeSignals);
  activeSignals.clear();
  return active;
}
