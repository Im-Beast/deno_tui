import { CanvasInstance } from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { KeyPress, MultiKeyPress } from "./key_reader.ts";
import { TuiInstance } from "./tui.ts";
import { TuiRectangle, TuiStyler } from "./types.ts";

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
  override?: GetCurrentStylerOptions,
) {
  const { styler, focusedWithin } = component;
  const { item, focused, active } = component.instance.selected;

  const isSelected = (item?.id == component.id) ||
    focusedWithin.some(({ id }) => item?.id === id);
  const isFocused = override?.focused?.value ||
    (!override?.focused?.force && isSelected && focused);
  const isActive = override?.active?.value ||
    (!override?.active?.force && isSelected && active);

  return (isActive
    ? styler.active || styler.focused
    : isFocused
    ? styler.focused
    : styler) || styler;
}

export interface TuiComponent<Events = void, Attributes = void> {
  readonly id: number;
  readonly name: string;
  readonly emitter:
    & EventEmitter<"key", KeyPress>
    & EventEmitter<"multiKey", MultiKeyPress>
    & EventEmitter<"focus" | "active", undefined>
    & EventEmitter<Events extends string ? Events : never, Attributes>;
  readonly remove: () => void;
  drawPriority: number;
  canvas: CanvasInstance;
  interactive: boolean;
  instance: TuiInstance;
  rectangle: TuiRectangle;
  children: AnyComponent[];
  focusedWithin: AnyComponent[];
  styler: TuiStyler;
  on: TuiComponent<Events, Attributes>["emitter"]["on"];
  off: TuiComponent<Events, Attributes>["emitter"]["off"];
  once: TuiComponent<Events, Attributes>["emitter"]["once"];
  draw: () => void;
}

// deno-lint-ignore no-explicit-any
export type AnyComponent = TuiComponent<any, any>;

export interface CreateComponentOptions {
  name: string;
  styler: TuiStyler;
  rectangle: TuiRectangle;
  interactive: boolean;
  focusedWithin?: AnyComponent[];
  draw?: () => void;
  drawPriority?: number;
}

let componentId = 0;
export function createComponent<Events = void, DataTypes = void>(
  object: TuiInstance | AnyComponent,
  {
    name,
    interactive,
    styler,
    rectangle,
    focusedWithin,
    draw = (() => {}),
    drawPriority = 0,
  }: CreateComponentOptions,
): TuiComponent<Events, DataTypes> {
  const emitter = createEventEmitter() as TuiComponent<
    Events,
    DataTypes
  >["emitter"];

  const instance = getInstance(object);
  const id = componentId++;

  const component: TuiComponent<Events, DataTypes> = {
    name,
    instance,
    interactive,
    drawPriority,
    id,
    canvas: instance.canvas,
    styler,
    rectangle,
    emitter,
    draw,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    children: [],
    focusedWithin: focusedWithin || [],
    remove: () => {
      component.off("*");

      object.children = object.children.filter((comp) => comp !== component);
      const compFilter = (
        comp: AnyComponent,
      ) => comp !== component;

      instance.interactiveComponents = instance.interactiveComponents.filter(
        compFilter,
      );

      instance.allComponents = instance.allComponents.filter(compFilter);

      for (const child of component.children) {
        child.remove();
      }
    },
  };

  if (component.interactive) {
    instance.interactiveComponents.push(component);
  }
  instance.allComponents.push(component);

  object.children.push(component);

  return component;
}
