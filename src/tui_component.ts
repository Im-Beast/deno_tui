import { CanvasInstance } from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { KeyPress, MultiKeyPress } from "./key_reader.ts";
import { TuiInstance } from "./tui.ts";
import {
  AnyComponent,
  Dynamic,
  TuiObject,
  TuiRectangle,
  TuiStyler,
} from "./types.ts";
import { getStaticValue } from "./util.ts";

export function getInstance(object: TuiInstance | AnyComponent) {
  return Object.hasOwn(object, "instance")
    ? (<TuiComponent> object).instance
    : object as TuiInstance;
}

export interface GetCurrentStylerOptions {
  focused?: {
    value: boolean;
    force?: boolean;
  };
  active?: {
    value: boolean;
    force?: boolean;
  };
}

export function getCurrentStyler(
  component: AnyComponent,
  options?: GetCurrentStylerOptions,
) {
  const styler = getStaticValue(component.styler);
  const { item, focused, active } = component.instance.selected;

  const isSelected = (item?.id == component.id) ||
    component.focusedWithin.some(({ id }) => item?.id === id);
  const isFocused = options?.focused?.value ||
    (!options?.focused?.force && isSelected && focused);
  const isActive = options?.active?.value ||
    (!options?.active?.force && isSelected && active);

  return (isActive
    ? styler.active || styler.focused
    : isFocused
    ? styler.focused
    : styler) || styler;
}

export type ExtendedTuiComponent<
  Name extends string = string,
  Extension = void,
  Events = void,
  Attributes = void,
> = TuiComponent<Name, Events, Attributes> & Extension;

export type TuiComponent<
  Name extends string = string,
  Events = void,
  Attributes = void,
> = {
  readonly id: number;
  readonly name: Name;
  readonly emitter:
    & EventEmitter<"key", KeyPress>
    & EventEmitter<"multiKey", MultiKeyPress>
    & EventEmitter<"focus" | "active", undefined>
    & EventEmitter<Events extends string ? Events : never, Attributes>;
  readonly on: TuiComponent<Name, Events, Attributes>["emitter"]["on"];
  readonly once: TuiComponent<Name, Events, Attributes>["emitter"]["once"];
  readonly off: TuiComponent<Name, Events, Attributes>["emitter"]["off"];
  draw: () => void;
  instance: TuiInstance;
  rectangle: Dynamic<TuiRectangle>;
  parent: TuiObject;
  children: AnyComponent[];
  focusedWithin: AnyComponent[];
  canvas: CanvasInstance;
  styler: Dynamic<TuiStyler>;
  drawPriority: number;
  interactive: boolean;
};

export interface CreateComponentOptions<Name extends string = string> {
  name: Name;
  styler?: Dynamic<TuiStyler>;
  rectangle: Dynamic<TuiRectangle>;
  interactive?: boolean;
  focusedWithin?: AnyComponent[];
  draw?: () => void;
  drawPriority?: number;
}

export function removeComponent(component: AnyComponent) {
  const { parent, instance } = component;
  component.off("*");

  const filter = (
    comp: AnyComponent,
  ) => comp !== component;

  parent.children = parent.children.filter(filter);
  instance.components = instance.components.filter(filter);

  for (const child of component.children) {
    removeComponent(child);
  }
}

let componentId = 0;
export function createComponent<
  Name extends string = string,
  Extension = void,
  Events = void,
  DataTypes = void,
>(
  object: TuiObject,
  {
    name,
    interactive = false,
    styler = object.styler,
    rectangle,
    focusedWithin = [],
    draw = (() => {}),
    drawPriority = 0,
  }: CreateComponentOptions<Name>,
  extension?: Extension,
): Extension extends void ? TuiComponent<Name, Events, DataTypes>
  : ExtendedTuiComponent<Name, Extension, Events, DataTypes> {
  const emitter = createEventEmitter() as TuiComponent<
    Name,
    Events,
    DataTypes
  >["emitter"];

  const instance = getInstance(object);

  const component: TuiComponent<Name, Events, DataTypes> = {
    id: componentId++,
    name,
    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    instance,
    rectangle,
    parent: object,
    children: [],
    focusedWithin,
    canvas: instance.canvas,
    styler,
    drawPriority,
    interactive,
    draw,
    ...extension,
  };

  instance.components.push(component);
  object.children.push(component);

  return component as Extension extends void
    ? TuiComponent<Name, Events, DataTypes>
    : ExtendedTuiComponent<Name, Extension, Events, DataTypes>;
}
