// Copyright 2022 Im-Beast. All rights reserved. MIT license.

/** Type for event listener function */
export type EventListener<
  Events extends EventRecord,
  Type extends keyof Events = keyof Events,
> = (this: EventEmitter<Events>, ...args: Events[Type]["args"]) => void | Promise<void>;

/**
 * Type for creating new arguments
 *  - Required as a workaround for simple tuples and arrays types not working properly
 */
export type EmitterEvent<Args extends unknown[] = unknown[]> = {
  args: Args;
};

export type EventRecord = Record<string, EmitterEvent>;

/** Custom implementation of event emitter */
export class EventEmitter<EventMap extends EventRecord> {
  listeners: {
    [key in keyof EventMap]?: EventListener<EventMap, key>[];
  } = {};

  /**
   * Add new listener for specified event type
   * If `once` is set to true it will run just once and then be removed from listeners list
   */
  on<Type extends keyof EventMap>(type: Type, listener: EventListener<EventMap, Type>, once?: boolean): () => void {
    let listeners = this.listeners[type];
    if (!listeners) {
      listeners = [];
      this.listeners[type] = listeners;
    }

    if (once) {
      const originalListener = listener;
      listener = (...args: EventMap[Type]["args"]) => {
        originalListener.apply(this, args);
        this.off(type, listener);
      };
    }

    if (listeners.includes(listener)) return () => this.off(type, listener);
    listeners.splice(listeners.length, 0, listener);
    return () => this.off(type, listener);
  }

  /**
   * Remove event listeners
   *  - If no event type is passed, every single listener will be removed
   *  - If just type is passed with no listener, every listener for specific type will be removed
   *  - If both type and listener is passed, just this specific listener will be removed
   */
  off(): void;
  off<Type extends keyof EventMap>(type: Type): void;
  off<Type extends keyof EventMap>(type: Type, listener: EventListener<EventMap, Type>): void;
  off<Type extends keyof EventMap>(type?: Type, listener?: EventListener<EventMap, Type>): void {
    if (!type) {
      this.listeners = {};
      return;
    }

    if (!listener) {
      this.listeners[type] = [];
      return;
    }

    const listeners = this.listeners[type];
    if (!listeners) return;
    listeners.splice(listeners.indexOf(listener), 1);
  }

  /** Emit specific type, after emitting all listeners associated with that event type will run with given arguments */
  emit<Type extends keyof EventMap>(type: Type, ...args: EventMap[Type]["args"]): void {
    const listeners = this.listeners[type];
    if (!listeners?.length) return;

    for (const listener of listeners!) {
      listener.apply(this, args);
    }
  }
}
