// Copyright 2021 Im-Beast. All rights reserved. MIT license.

export interface EventEmitter<Event extends string, DataType> {
  listeners: Listener<Event, DataType>[];

  emit: (event: Event, ...data: DataType[]) => void;
  on: EventFunction<Event, DataType>;
  once: EventFunction<Event, DataType>;
  off: (
    event: Event | "*",
    func?: ListenerFunction<DataType>,
  ) => void;
}

type EventFunction<Event extends string, DataType> = (
  event: Event,
  func: ListenerFunction<DataType>,
  priority?: number,
) => void;

type ListenerFunction<DataType> = (...data: DataType[]) => void;

/** Object which stores data about function that fires on given event */
export interface Listener<Event extends string, DataType> {
  /** Event on which Listener's `func` will be fired */
  event: Event;
  /** Function fired when Listener's `event` gets emitted */
  func: ListenerFunction<DataType>;
  /** Priority of the Listener, higher priority listeners will get fired before lower priority ones */
  priority: number;
}

/**
 * Create EventListener
 */
export function createEventEmitter<
  Event extends string,
  DataType,
>(): EventEmitter<Event, DataType> {
  let listeners: Listener<Event, DataType>[] = [];

  type emitter = EventEmitter<Event, DataType>;

  const emit: emitter["emit"] = (emitEvent, ...data) => {
    listeners
      .filter(({ event }) => emitEvent === event)
      .sort((a, b) => b.priority - a.priority)
      .forEach(({ func }) => setTimeout(() => func(...data), 0));
  };

  const on: emitter["on"] = (event, func, priority = 0) => {
    listeners.push({ event, func, priority } as Listener<Event, DataType>);
  };

  const once: emitter["once"] = (event, func, priority = 0) => {
    on(event, func, priority);
    on(event, () => off(event, func));
  };

  const off: emitter["off"] = (event, func) => {
    if (!func) {
      listeners = listeners.filter((
        listener,
      ) => (listener.event !== event || event === "*"));
    } else {
      listeners = listeners.filter((listener) =>
        (listener.event !== event || event === "*") || listener.func !== func
      );
    }
  };

  return {
    listeners,
    emit,
    on,
    once,
    off,
  };
}
