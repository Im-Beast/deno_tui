// Copyright 2021 Im-Beast. All rights reserved. MIT license.
/** EventEmitter allows to emit and handle emitted events asynchronously */
export interface EventEmitter<Event extends string, DataType> {
  listeners: Listener<Event, DataType>[];
  /** Emits event with given data */
  emit: (event: Event | Event[], ...data: DataType[]) => void;
  /** Handles given event using given function */
  on: (
    event: Event | Event[],
    func: ListenerFunction<DataType>,
    priority?: number,
    once?: boolean,
  ) => void;
  /** Handles given event using given function only once */
  once: (
    event: Event | Event[],
    func: ListenerFunction<DataType>,
    priority?: number,
  ) => void;
  /** Disables event handler that matches given event and/or function */
  off: (
    event: Event | Event[] | "*",
    func?: ListenerFunction<DataType>,
  ) => void;
}

type ListenerFunction<DataType> = (...data: DataType[]) => void;

/** Object which stores data about function that fires on given event */
export interface Listener<Event extends string, DataType> {
  /** Event on which Listener's `func` will be fired */
  event: Event;
  /** Function fired when Listener's `event` gets emitted */
  func: ListenerFunction<DataType>;
  /** Priority of the Listener, higher priority listeners will get fired before lower priority ones */
  priority: number;
  /** Whether Listener should fire only once */
  once: boolean;
}

/**
 * Create EventListener
 * @example
 * ```ts
 * const emitter = createEventEmitter<"greeting" | "farewell", string>();
 *
 * emitter.on("greeting", console.log);
 * emitter.on("farewell", console.log);
 *
 * setTimeout(() => {
 *  emitter.emit("greeting", "hello!")
 * }, 100);
 *
 * setTimeout(() => {
 *   emitter.emit("farewell", "bye!")
 * }, 500);
 * ```
 */
export function createEventEmitter<
  Event extends string,
  DataType,
>(): EventEmitter<Event, DataType> {
  let listeners: Listener<Event, DataType>[] = [];

  type emitter = EventEmitter<Event, DataType>;

  const emit: emitter["emit"] = (emitEvent, ...data) => {
    listeners
      .filter(({ event }) =>
        typeof emitEvent === "string"
          ? emitEvent === event
          : emitEvent.includes(event)
      )
      .sort((a, b) => b.priority - a.priority)
      .forEach(({ func }) => setTimeout(() => func(...data), 0));

    listeners = listeners.filter(({ once }) => !once);
  };

  const on: emitter["on"] = (event, func, priority = 0, once = false) => {
    if (Array.isArray(event)) {
      for (const singleEvent of event) {
        listeners.push(
          { event: singleEvent, func, priority, once },
        );
      }
    } else {
      listeners.push(
        { event, func, priority, once },
      );
    }
  };

  const once: emitter["once"] = (event, func, priority = 0) => {
    on(event, func, priority, true);
  };

  const off: emitter["off"] = (event, func) => {
    if (!func) {
      listeners = listeners.filter((
        listener,
      ) => (listener.event !== event && event !== "*"));
    } else {
      listeners = listeners.filter((listener) =>
        (listener.event !== event && event !== "*") || listener.func !== func
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
