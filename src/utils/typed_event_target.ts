// Copyright 2022 Im-Beast. All rights reserved. MIT license.
export type EventRecord = Record<string, Event>;

export class TypedEventTarget<EventMap extends EventRecord> {
  eventTarget: EventTarget;

  constructor() {
    this.eventTarget = new EventTarget();
  }

  addEventListener<Event extends keyof EventMap>(
    types: Event | Event[],
    listener: (this: TypedEventTarget<EventMap>, event: EventMap[Event]) => void | Promise<void>,
    options?: AddEventListenerOptions,
  ): void {
    types = Array.isArray(types) ? types : [types];
    for (const type of types) {
      this.eventTarget.addEventListener(type as string, listener as EventListener, options);
    }
  }

  removeEventListener<Event extends keyof EventMap>(
    types: Event | Event[],
    listener: (this: TypedEventTarget<EventMap>, event: EventMap[Event]) => void | Promise<void>,
    options?: AddEventListenerOptions,
  ): void {
    types = Array.isArray(types) ? types : [types];
    for (const type of types) {
      this.eventTarget.removeEventListener(type as string, listener as EventListener, options);
    }
  }

  dispatchEvent<EventType extends Event>(event: EventType): boolean {
    return this.eventTarget.dispatchEvent(event);
  }
}
