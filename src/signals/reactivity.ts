// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Signal } from "./signal.ts";

export type Reactive<T> = T & {
  [IS_REACTIVE]: true;
  [ORIGINAL_REF]: T;
  [CONNECTED_SIGNAL]: Signal<T>;
};

export const IS_REACTIVE = Symbol("reactive");
export const ORIGINAL_REF = Symbol("original_ref");
export const CONNECTED_SIGNAL = Symbol("connected_signal");

export function isReactive<T extends object>(input: T): input is Reactive<T> {
  return IS_REACTIVE in input;
}

export function getConnectedSignal<T extends object>(input: T | Reactive<T>): Signal<T> {
  if (isReactive(input)) {
    return input[CONNECTED_SIGNAL];
  }

  throw "Failed to get connected signal as input isn't reactive";
}

export function getOriginalRef<T extends object>(input: T | Reactive<T>): T {
  if (isReactive(input)) {
    return input[ORIGINAL_REF];
  }

  throw "Failed to get original referenec as input isn't reactive";
}

/**
 * Replaces `set`, `delete` and `clear` methods in given map with ones that provide reactivity.
 *
 * When map gets in any way updated `propagate` method gets called on provided signal.
 *
 * @param watchMapUpdates
 * Changes method of detecting value changes when `.set()` gets called.
 *  - When set to `true` it checks whether value changed.
 *  - When set to `false` it checks whether map size changed (default).
 */
export function makeMapMethodsReactive<T extends Map<unknown, unknown>, S>(
  map: T,
  signal: Signal<S>,
  watchMapUpdates = false,
): T {
  Object.defineProperties(map, {
    [IS_REACTIVE]: { value: true },
    [ORIGINAL_REF]: { value: map },
    [CONNECTED_SIGNAL]: { value: signal },
  });

  type MapType = T extends Map<infer K, infer V> ? [K, V] : never;
  type MapKeyType = MapType[0];
  type MapValueType = MapType[1];

  const set = map.set.bind(map);

  let $set: T["set"];

  if (watchMapUpdates) {
    $set = function $set(key: MapKeyType, value: MapValueType) {
      const previousValue = map.get(key);

      set(key, value);

      if (value !== previousValue) {
        signal.propagate();
      }
      return map;
    };
  } else {
    $set = function $step(key: MapKeyType, value: MapValueType) {
      const { size } = map;

      set(key, value);

      if (map.size > size) {
        signal.propagate();
      }
      return map;
    };
  }

  const del = map.delete.bind(map);
  function $delete(key: MapKeyType) {
    const removed = del(key);
    if (removed) {
      signal.propagate();
    }
    return removed;
  }

  const clear = map.clear.bind(map);
  function $clear() {
    const { size } = map;
    clear();
    if (size > 0) {
      signal.propagate();
    }
  }

  Object.defineProperties(map, {
    set: { value: $set },
    delete: { value: $delete },
    clear: { value: $clear },
  });

  return map;
}

/**
 * Replaces `add`, `delete` and `clear` methods in given set with ones that provide reactivity.
 *
 * When set gets in any way updated `propagate` method gets called on provided signal.
 */
export function makeSetMethodsReactive<T extends Set<unknown>, S>(set: T, signal: Signal<S>): T {
  Object.defineProperties(set, {
    [IS_REACTIVE]: { value: true },
    [ORIGINAL_REF]: { value: set },
    [CONNECTED_SIGNAL]: { value: signal },
  });

  const add = set.add.bind(set);
  function $add(value: Parameters<T["add"]>[0]) {
    const { size } = set;

    add(value);

    if (set.size > size) {
      signal.propagate();
    }
    return set;
  }

  const del = set.delete.bind(set);
  function $delete(value: Parameters<T["delete"]>[0]) {
    const removed = del(value);
    if (removed) {
      signal.propagate();
    }
    return removed;
  }

  const clear = set.clear.bind(set);
  function $clear() {
    const { size } = set;

    clear();

    if (size > 0) {
      signal.propagate();
    }
  }

  Object.defineProperties(set, {
    add: { value: $add },
    delete: { value: $delete },
    clear: { value: $clear },
  });

  return set;
}

/**
 * Replaces `push`, `pop`, `sort` and `replace` methods in given array with ones that provide reactivity.
 *
 * When map gets in any way updated `propagate` method gets called on provided signal.
 *
 * @param watchObjectIndex – When set to `true` it checks whether array got directly modified via index
 */
export function makeArrayMethodsReactive<T extends Array<unknown>, S>(
  array: T,
  signal: Signal<S>,
  watchObjectIndex = false,
): T {
  Object.defineProperties(array, {
    [IS_REACTIVE]: { value: true },
    [ORIGINAL_REF]: { value: array },
    [CONNECTED_SIGNAL]: { value: signal },
  });

  if (watchObjectIndex) {
    return makeObjectPropertiesReactive(array, signal, true);
  }

  const push = array.push.bind(array);
  function $push(...items: unknown[]) {
    const output = push(...items);
    if (output > 0) signal.propagate();
    return output;
  }

  const pop = array.pop.bind(array);
  function $pop() {
    const { length } = array;

    const output = pop();

    if (length > 0) {
      signal.propagate();
    }
    return output;
  }

  const splice = array.splice.bind(array);
  function $splice(start: number, deleteCount: number, ...items: unknown[]) {
    const output = splice(start, deleteCount, ...items);
    if (output.length > 0) {
      signal.propagate();
    }
    return output;
  }

  const sort = Array.prototype.sort.bind(array);
  function $sort(compareFn: Parameters<T["sort"]>[0]) {
    const output = sort(compareFn) as T & [];
    signal.propagate();
    return output;
  }

  const reverse = Array.prototype.reverse.bind(array);
  function $reverse() {
    const output = reverse();
    signal.propagate();
    return output;
  }

  Object.defineProperties(array, {
    push: { value: $push },
    pop: { value: $pop },
    splice: { value: $splice },
    sort: { value: $sort },
    reverse: { value: $reverse },
  });

  return array;
}

/**
 * Watches the object for changes and when they happen `propagate` method gets called on provided signal.
 *
 * @param watchObjectIndex – Changes the way reactivity is handled
 *  - When set to `true` it creates `Proxy` which watches properties, even new ones.
 *  - When set to `false` it uses `Object.defineProperty` to watch properties that existed at the time of creating signal.
 *
 * @returns new object, not direct reference to given object
 */
export function makeObjectPropertiesReactive<T, S>(object: T, signal: Signal<S>, watchObjectIndex = false): T {
  if (typeof object !== "object") {
    throw new Error("parameter object needs to be typeof 'object'");
  }

  if (Array.isArray(object)) {
    makeArrayMethodsReactive(object, signal);
    if (!watchObjectIndex) return object;
  } else {
    Object.defineProperties(object, {
      [IS_REACTIVE]: { value: true },
      [ORIGINAL_REF]: { value: object },
      [CONNECTED_SIGNAL]: { value: signal },
    });
  }

  if (watchObjectIndex) {
    // deno-lint-ignore no-explicit-any
    const proxyHandler: ProxyHandler<any> = {
      set(target, property, value) {
        if (target[property] !== (target[property] = value)) {
          signal.propagate();
        }
        return true;
      },
    };

    return new Proxy(object, proxyHandler);
  }

  const interceptor = {} as T;
  Object.defineProperties(interceptor, {
    [IS_REACTIVE]: { value: true },
    [ORIGINAL_REF]: { value: object },
    [CONNECTED_SIGNAL]: { value: signal },
  });

  for (const property in object) {
    Object.defineProperty(interceptor, property, {
      enumerable: true,
      get() {
        return object[property];
      },
      set(value) {
        if (object[property] !== (object[property] = value)) {
          signal.propagate();
        }
      },
    });
  }

  return interceptor;
}
