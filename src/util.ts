export enum Timing {
  Pre = "pre",
  Post = "post",
}

export function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export class TypedCustomEvent<
  Event = string,
  EventInit = unknown,
> extends CustomEvent {
  constructor(typeArg: Event, eventInitDict?: CustomEventInit<EventInit>) {
    super(typeArg as unknown as string, eventInitDict);
  }
}

export class TypedEventTarget<
  EventMap extends Record<string, unknown>,
> {
  #eventTarget: EventTarget;

  constructor() {
    this.#eventTarget = new EventTarget();
  }

  addEventListener<EventType extends keyof EventMap>(
    type: EventType,
    listener: (
      ev: TypedCustomEvent<EventType, EventMap[EventType]>,
    ) => void | Promise<void>,
    options?: boolean | AddEventListenerOptions,
  ): void {
    return this.#eventTarget.addEventListener(
      type as string,
      listener as EventListener,
      options,
    );
  }

  dispatchEvent<EventType extends keyof EventMap>(
    event: TypedCustomEvent<EventType, EventMap[EventType]>,
  ): boolean {
    return this.#eventTarget.dispatchEvent(event);
  }

  removeEventListener<EventType extends keyof EventMap>(
    type: EventType,
    listener: (ev: TypedCustomEvent<EventType, EventMap[EventType]>) => void,
    options?: boolean | EventListenerOptions | undefined,
  ): void {
    return this.#eventTarget.removeEventListener(
      type as string,
      listener as EventListener,
      options,
    );
  }
}
