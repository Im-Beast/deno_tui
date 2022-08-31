// Copyright 2022 Im-Beast. All rights reserved. MIT license.

export type EventListener<
  Events extends Record<string, unknown[]>,
  Type extends keyof Events = keyof Events,
> = (this: EventEmitter<Events>, ...args: Events[Type]) => void | Promise<void>;

export class EventEmitter<EventMap extends Record<string, unknown[]> = Record<string, unknown[]>> {
  // deno-lint-ignore no-explicit-any
  #listeners = new Map<keyof EventMap, EventListener<EventMap, any>[]>();

  on<Type extends keyof EventMap>(type: Type, listener: EventListener<EventMap, Type>): void {
    let listeners = this.#listeners.get(type);
    if (!listeners) {
      listeners = [];
      this.#listeners.set(type, listeners);
    }

    if (listeners.includes(listener)) return;
    listeners.splice(listeners.length, 0, listener);
  }

  once<Type extends keyof EventMap>(type: Type, listener: EventListener<EventMap, Type>): void {
    this.on(type, listener);
    this.on(type, () => this.off(type, listener));
  }

  off(): void;
  off<Type extends keyof EventMap>(type: Type): void;
  off<Type extends keyof EventMap>(type: Type, listener: EventListener<EventMap, Type>): void;
  off<Type extends keyof EventMap>(type?: Type, listener?: EventListener<EventMap, Type>): void {
    if (!type) {
      this.#listeners = new Map();
      return;
    }

    if (!listener) {
      this.#listeners.set(type, []);
      return;
    }

    const listeners = this.#listeners.get(type);
    if (!listeners) return;
    listeners.splice(listeners.indexOf(listener), 1);
  }

  emit<Type extends keyof EventMap>(type: Type, ...args: EventMap[Type]): void {
    const listeners = this.#listeners.get(type);
    if (!listeners?.length) return;

    for (const listener of listeners) {
      listener.apply(this, args);
    }
  }
}
