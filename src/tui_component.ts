import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { PrivateTui, Rectangle, Styler, Tui } from "./tui.ts";
import { AnyComponent, TuiObject } from "./types.ts";

export function removeComponent(component: AnyComponent, recurse = true): void {
  const { tui, parent } = component;
  component.off("*");

  for (const [i, child] of parent.children.entries()) {
    if (component === child) {
      parent.children.splice(i, 1);
      break;
    }
  }

  for (const [i, comp] of tui.components.entries()) {
    if (component === comp) {
      tui.children.splice(i, 1);
      break;
    }
  }

  if (recurse) {
    for (const child of component.children) {
      removeComponent(child, recurse);
    }
  }
}

type ExtensionRecord = Record<string | number | symbol, unknown>;

export interface PrivateComponent<
  N extends string = string,
  EXT extends ExtensionRecord = Record<never, never>,
  EV extends string = never,
  EDT = void,
> extends Component<N, EXT, EV, EDT> {
  readonly emitter:
    & PrivateTui["emitter"]
    & EventEmitter<EV, EDT>;
}

type EmitterShortcut<
  N extends string = string,
  EXT extends ExtensionRecord = Record<never, never>,
  EV extends string = never,
  EDT = void,
> = PrivateComponent<N, EXT, EV, EDT>["emitter"];

export interface Component<
  N extends string = string,
  EXT extends ExtensionRecord = Record<never, never>,
  EV extends string = never,
  EDT = void,
> {
  readonly name: N;

  readonly tui: Tui;
  readonly parent: TuiObject;
  readonly children: AnyComponent[];

  readonly styler: Styler;
  readonly rectangle: Rectangle;

  readonly on: EmitterShortcut<N, EXT, EV, EDT>["on"];
  readonly once: EmitterShortcut<N, EXT, EV, EDT>["once"];
  readonly off: EmitterShortcut<N, EXT, EV, EDT>["off"];
  readonly emit: EmitterShortcut<N, EXT, EV, EDT>["emit"];

  readonly focus: () => void;
  readonly active: () => void;
  readonly update: () => void;
  readonly draw: () => void;
}

export interface CreateComponentOptions<N extends string = string> {
  name: N;

  styler: Styler;
  rectangle: Rectangle;

  focus: () => void;
  active: () => void;
  update: () => void;
  draw: () => void;
}

export function createComponent<
  Name extends string = string,
  Extension extends ExtensionRecord = Record<never, never>,
  Events extends string = never,
  EventDataType = void,
>(
  parent: TuiObject,
  {
    name,
    styler,
    rectangle,
    focus,
    active,
    update,
    draw,
  }: CreateComponentOptions<Name>,
  extension?: Extension,
): Component<Name, Extension, Events, EventDataType> {
  type PC = PrivateComponent<Name, Extension, Events, EventDataType>;

  const emitter = createEventEmitter() as PC["emitter"];

  const tui: Tui = Object.hasOwn(parent, "parent")
    ? Reflect.get(parent, "instance")
    : parent;

  const component: PC = {
    name,

    parent,
    tui,
    children: [],

    styler,
    rectangle,

    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    emit: emitter.emit,

    focus,
    active,
    update,
    draw,
    ...extension,
  };

  tui.children.push(component);
  tui.emit("createComponent", component);

  if (parent !== tui) {
    parent.emit("createComponent", component);
  }

  return component;
}
