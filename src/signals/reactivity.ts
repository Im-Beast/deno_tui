// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Signal } from "./signal.ts";

export const IS_REACTIVE = Symbol("reactive");

export function makeMapMethodsReactive<T extends Map<unknown, unknown>, S>(
  map: T,
  signal: Signal<S>,
  watchMapUpdates = false,
): T {
  Object.defineProperty(map, IS_REACTIVE, { value: true });

  let previousValue: Parameters<T["get"]>[0];

  const set = map.set.bind(map);
  function $set(key: Parameters<T["set"]>[0], value: Parameters<T["delete"]>[1]) {
    const { size } = map;
    if (watchMapUpdates) {
      previousValue = map.get(key);
    }

    set(key, value);

    if (map.size > size || (watchMapUpdates && value !== previousValue)) {
      signal.propagate();
    }
    return map;
  }

  const del = map.delete.bind(map);
  function $delete(value: Parameters<T["delete"]>[0]) {
    const removed = del(value);
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

export function makeSetMethodsReactive<T extends Set<unknown>, S>(set: T, signal: Signal<S>): T {
  Object.defineProperty(set, IS_REACTIVE, { value: true });

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

export function makeArrayMethodsReactive<T extends Array<unknown>, S>(
  array: T,
  signal: Signal<S>,
  watchObjectIndex = false,
): T {
  Object.defineProperty(array, IS_REACTIVE, { value: true });

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
    sot: { value: $sort },
    reverse: { value: $reverse },
  });

  return array;
}

export function makeObjectPropertiesReactive<T, S>(object: T, signal: Signal<S>, watchObjectIndex = false): T {
  if (typeof object !== "object") {
    throw new Error("parameter object needs to be typeof 'object'");
  }

  if (Array.isArray(object)) {
    makeArrayMethodsReactive(object, signal);
    if (!watchObjectIndex) return object;
  } else {
    Object.defineProperty(object, IS_REACTIVE, { value: true });
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
  Object.defineProperty(interceptor, IS_REACTIVE, { value: true });

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
