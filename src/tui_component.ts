// deno-lint-ignore-file ban-types
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { PrivateTui, Tui, TuiStyler } from "./tui.ts";
import { AnyComponent, Rectangle, TuiObject } from "./types.ts";

export interface GetCurrentStylerOptions {
  /** Whether to overwrite focus value */
  focused?: {
    /**
     * Status for which `focus` will be overwritten
     * When `force` is set to false output will be OR'ed
     */
    value: boolean;
    /** Whether to force status */
    force?: boolean;
  };
  /** Whether to overwrite active value */
  active?: {
    /**
     * Status for which `active` will be overwritten
     * When `force` is set to false output will be OR'ed
     */
    value: boolean;
    /** Whether to force status */
    force?: boolean;
  };
}

/**
 * Get current CanvasStyler of component from TuiStyler
 * @param component - Component for which styler will be gotten
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * const component = createComponent(tui, ...);
 * component.styler = {
 *  foreground: "\x1b[32m",
 *  background: "\x1b[42m",
 *  active: {
 *    foreground: "\x1b[33m",
 *    background: "\x1b[43m",
 *  },
 *  focused: {
 *    foreground: "\x1b[34m",
 *    background: "\x1b[44m",
 *   }
 * };
 *
 * getCurrentStyler(component); // -> component.styler
 * getCurrentStyler(component, {
 *  focused: {
 *    value: true,
 *    force: true,
 *  }
 * }); // -> component.styler.focused
 *
 * tui.selected.item = component;
 * tui.selected.item.focused = true;
 * getCurrentStyler(component); // -> component.styler.focused
 *
 * tui.selected.item.active = true;
 * getCurrentStyler(component); // -> component.styler.active
 * ```
 */
export function getCurrentStyler(
  component: AnyComponent,
  options?: GetCurrentStylerOptions,
): TuiStyler {
  const styler = component.styler;
  const { item, active } = component.tui.focused;

  const isSelected = (item === component) ||
    component.focusedWithin.some((component) => item === component);

  if (!isSelected) return styler;

  if (
    options?.active?.value ||
    (!options?.active?.force && isSelected && active)
  ) {
    return { ...styler, ...styler.focused, ...styler.active };
  }

  if (
    options?.focused?.value ||
    (!options?.focused?.force && isSelected)
  ) {
    return { ...styler, ...styler.focused };
  }

  return styler;
}

/**
 * Remove/Destroy component
 * - Disables all of its events
 * - Removes it from its parent and TuiInstance
 * - Removes all of its children (recurses)
 * @param component - component that will be removed
 * @example
 * ```ts
 * const component = createComponent(...);
 * ...
 * removeComponent(component);
 * ```
 */
export function removeComponent(component: AnyComponent): void {
  const { tui, parent } = component;

  tui.emit("removeComponent", component);
  parent.emit("removeComponent", component);

  component?.remove?.();
  component.emit("removeComponent", component);
  component.off("*");

  while (component.children.length) {
    removeComponent(component.children[0]);
  }

  parent.children.splice(parent.children.indexOf(component), 1);
  tui.components.splice(tui.components.indexOf(component), 1);
}

export type PrivateComponent<
  N extends string = string,
  EXT extends Object = Record<never, never>,
  EV extends string = never,
  EDT = void,
> = ExtendedComponent<N, EXT, EV, EDT> & {
  readonly emitter:
    & PrivateTui["emitter"]
    & EventEmitter<EV, EDT>;
};

type EmitterShortcut<
  N extends string = string,
  EV extends string = never,
  EDT = void,
> = PrivateComponent<N, Record<never, never>, EV, EDT>["emitter"];

export type ExtendedComponent<
  N extends string = string,
  EXT extends Object = Record<never, never>,
  EV extends string = never,
  EDT = void,
> = Component<N, EV, EDT> & EXT;

export type Component<
  N extends string = string,
  EV extends string = never,
  EDT = void,
> = {
  readonly name: N;
  readonly interactive: boolean;
  readonly drawPriority: number;

  readonly tui: Tui;
  readonly parent: TuiObject;
  readonly children: AnyComponent[];
  readonly focusedWithin: AnyComponent[];

  readonly styler: TuiStyler;
  readonly rectangle: Rectangle;

  readonly on: EmitterShortcut<N, EV, EDT>["on"];
  readonly once: EmitterShortcut<N, EV, EDT>["once"];
  readonly off: EmitterShortcut<N, EV, EDT>["off"];
  readonly emit: EmitterShortcut<N, EV, EDT>["emit"];

  readonly focus?: () => void;
  readonly active?: () => void;
  readonly update?: () => void;
  readonly draw?: () => void;
  readonly remove?: () => void;
};

export interface CreateComponentOptions<N extends string = string> {
  name: N;
  interactive: boolean;
  drawPriority?: number;

  focusedWithin?: AnyComponent[];

  styler?: TuiStyler;
  rectangle: Rectangle;

  focus?: () => void;
  active?: () => void;
  update?: () => void;
  draw?: () => void;
  remove?: () => void;
}

/**
 * Create Component or ExtendedComponent based on whether `extension` is present
 * @param parent - parent of the component
 * @param options - options for component
 * @param extension - expanded settings for component
 * @example // look in `src/components/` dir for example components
 */
export function createComponent<
  Name extends string = string,
  Extension extends Object = Record<never, never>,
  Events extends string = never,
  EventDataType = void,
>(
  parent: TuiObject,
  {
    name,
    interactive,
    drawPriority = 0,
    focusedWithin = [],
    styler = parent.styler,
    rectangle,
    focus,
    active,
    update,
    draw,
    remove,
  }: CreateComponentOptions<Name>,
  extension?: Extension,
): (Extension extends void ? Component<Name, Events, EventDataType>
  : ExtendedComponent<Name, Extension, Events, EventDataType>) {
  type PrivateComp = Extension extends void
    ? PrivateComponent<Name, Record<never, never>, Events, EventDataType>
    : PrivateComponent<Name, Extension, Events, EventDataType>;

  const emitter = createEventEmitter() as PrivateComp["emitter"];

  const tui: Tui = Object.hasOwn(parent, "tui")
    ? Reflect.get(parent, "tui")
    : parent;

  const component = {
    name,
    interactive,
    drawPriority,

    parent,
    tui,
    children: [],
    focusedWithin,

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
    remove,

    ...extension,
  } as unknown as PrivateComp;

  tui.components.push(component);
  parent.children.push(component);

  tui.emit("createComponent", component);
  if (parent !== tui) {
    parent.emit("createComponent", component);
  }

  return component as (Extension extends void
    ? Component<Name, Events, EventDataType>
    : ExtendedComponent<Name, Extension, Events, EventDataType>);
}
