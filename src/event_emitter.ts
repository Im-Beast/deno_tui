export type EventEmitter<Event extends string, DataType> = {
  listeners: Listener<Event, DataType>[];
  emit: (event: Event, ...data: DataType[]) => void;
  on: EventFunction<Event, DataType>;
  once: EventFunction<Event, DataType>;
  off: EventFunction<Event, DataType>;
};

export type EventFunction<Event extends string, DataType> = (
  event: Event,
  func: ListenerFunction<DataType>,
) => void;

export type ListenerFunction<DataType> = (...data: DataType[]) => void;

export interface Listener<Event extends string, DataType> {
  event: Event;
  func: ListenerFunction<DataType>;
}

export function createEventEmitter<
  Event extends string,
  DataType,
>(): EventEmitter<Event, DataType> {
  let listeners: Listener<Event, DataType>[] = [];

  const emit = (emitEvent: Event, ...data: DataType[]) => {
    listeners
      .filter(({ event }) => emitEvent === event)
      .forEach(({ func }) => setTimeout(() => func(...data), 0));
  };

  const on = (event: Event, func: ListenerFunction<DataType>) => {
    listeners.push({ event, func } as Listener<Event, DataType>);
  };

  const once = (event: Event, func: ListenerFunction<DataType>) => {
    on(event, func);
    on(event, () => off(event, func));
  };

  const off = (event: Event, func?: ListenerFunction<DataType>) => {
    listeners = listeners.filter((listener) =>
      listener.event !== event || (!func || listener.func !== func)
    );
  };

  return {
    listeners,
    emit,
    on,
    once,
    off,
  };
}
