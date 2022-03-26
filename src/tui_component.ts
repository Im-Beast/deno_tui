// Copyright 2021 Im-Beast. All rights reserved. MIT license.
// deno-lint-ignore-file ban-types
import { Canvas, CompileStyler } from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { PrivateTui, Tui, TuiStyler } from "./tui.ts";
import { AnyComponent, Rectangle, TuiObject } from "./types.ts";
import { cloneAndAssign } from "./util.ts";

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
): CompileStyler<TuiStyler> {
  const styler = component.styler;
  const { item, active } = component.tui.focused;

  const isSelected = (item === component) ||
    component.focusedWithin.some((component) => item === component);

  if (!isSelected) return styler;

  if (active) {
    return { ...styler, ...styler.focused, ...styler.active };
  }

  return { ...styler, ...styler.focused };
}

/**
 * Remove/Destroy component
 * - Disables all of its events
 * - Removes it from tui and its parent children
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

/** Private properties for Component */
export type PrivateComponent<
  Name extends string = string,
  Extension extends Object = Record<never, never>,
  Events extends string = never,
  EventDataType = void,
> = ExtendedComponent<Name, Extension, Events, EventDataType> & {
  /** Component's EventEmitter */
  readonly emitter:
    & PrivateTui["emitter"]
    & EventEmitter<Events, EventDataType>;
};

type EmitterShortcut<
  Name extends string = string,
  Events extends string = never,
  EventDataType = void,
> = PrivateComponent<
  Name,
  Record<never, never>,
  Events,
  EventDataType
>["emitter"];

/** Component but extended using object - has its own properties */
export type ExtendedComponent<
  Name extends string = string,
  Extension extends Object = Record<never, never>,
  Events extends string = never,
  EventDataType = void,
> = Component<Name, Events, EventDataType> & Extension;

/** Basic component that tui is built upon */
export type Component<
  Name extends string = string,
  Events extends string = never,
  EventDataType = void,
> = {
  /** Unique ID for components */
  readonly id: number;

  /** Name of the component */
  readonly name: Name;
  /** Whether component is interactive */
  readonly interactive: boolean;
  /** Priority of which component will be drawn */
  readonly drawPriority: number;

  /** Tui instance of component */
  readonly tui: Tui;
  /** Parent of component, either tui or other component */
  readonly parent: TuiObject;
  /** Children components of component */
  readonly children: AnyComponent[];
  /** When any of these components gets focused getCurrentStyler returns this object focused styler */
  readonly focusedWithin: AnyComponent[];

  /** Canvas on which component is rendered */
  canvas: Canvas;
  /** Definition of component's look */
  readonly styler: CompileStyler<TuiStyler>;
  /** Size and position of component */
  readonly rectangle: Rectangle;

  /** Handle given functions on specific tui events */
  readonly on: EmitterShortcut<Name, Events, EventDataType>["on"];
  /** Handle given functions only once on specific tui events */
  readonly once: EmitterShortcut<Name, Events, EventDataType>["once"];
  /** Disable handling specific functions on tui events */
  readonly off: EmitterShortcut<Name, Events, EventDataType>["off"];
  /** Emit event which will fire functions specified to it */
  readonly emit: EmitterShortcut<Name, Events, EventDataType>["emit"];

  /** Function fired when component gets focused */
  readonly focus?: () => void;
  /** Function fired when component gets activated */
  readonly active?: () => void;
  /** Function fired after component has been updated (before has been drawn) */
  readonly update?: () => void;
  /** Function fired when component has been drawn */
  readonly draw?: () => void;
  /** Function fired before component has been removed */
  readonly remove?: () => void;
};

export interface CreateComponentOptions<Name extends string = string> {
  /** Name of the component */
  name: Name;
  /** Whether component is interactive */
  interactive: boolean;
  /** Priority of which component will be drawn */
  drawPriority?: number;

  /** When any of these components gets focused getCurrentStyler returns this object focused styler */
  focusedWithin?: AnyComponent[];

  /** Overwrite drawing canvas */
  canvas?: Canvas;
  /** Definition of component's look */
  styler?: CompileStyler<TuiStyler>;
  /** Size and position of component */
  rectangle?: Rectangle;

  /** Function fired when component gets focused */
  focus?: () => void;
  /** Function fired when component gets activated */
  active?: () => void;
  /** Function fired after component has been updated (before has been drawn) */
  update?: () => void;
  /** Function fired when component has been drawn */
  draw?: () => void;
  /** Function fired before component has been removed */
  remove?: () => void;
}

let id = 0;
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
  options: (
    Extension extends void ? CreateComponentOptions<Name>
      : Omit<CreateComponentOptions<Name>, keyof Extension>
  ),
  extension?: Extension,
): (
  Extension extends void ? Component<Name, Events, EventDataType>
    : ExtendedComponent<Name, Extension, Events, EventDataType>
) {
  type PrivateComp = Extension extends void
    ? PrivateComponent<Name, Record<never, never>, Events, EventDataType>
    : PrivateComponent<Name, Extension, Events, EventDataType>;

  const emitter = createEventEmitter() as PrivateComp["emitter"];

  const tui: Tui = Object.hasOwn(parent, "tui")
    ? Reflect.get(parent, "tui")
    : parent;

  const component = cloneAndAssign(
    {
      id: id++,

      parent,
      tui,
      children: [],
      focusedWithin: [],

      canvas: options.canvas ?? parent.canvas,
      styler: parent.styler,
      rectangle: {
        column: 0,
        row: 0,
        width: 0,
        height: 0,
      },

      emitter,
      on: emitter.on,
      once: emitter.once,
      off: emitter.off,
      emit: emitter.emit,

      ...extension,
    },
    options,
    extension || {},
  ) as PrivateComp;

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
