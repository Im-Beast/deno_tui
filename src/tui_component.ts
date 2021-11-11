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
  { name, interactive, styler, rectangle, focusedWithin, draw, drawPriority }:
    CreateComponentOptions,
): TuiComponent<Events, DataTypes> {
  const emitter = createEventEmitter() as TuiComponent<
    Events,
    DataTypes
  >["emitter"];

  const instance = getInstance(object);

  const id = componentId++;
  draw ||= () => {};

  const component: TuiComponent<Events, DataTypes> = {
    name,
    instance,
    interactive,
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
      console.log(Date.now(), component.name);

      component.off("*");
      instance.off("draw", () => component.draw());

      object.children = object.children.filter((comp) => comp !== component);

      instance.interactiveComponents.filter((comp) => comp !== component);

      for (const child of component.children) {
        child.remove();
      }

      instance.emitter.emit("draw");
    },
  };

  if (component.interactive) {
    instance.interactiveComponents.push(component);
  }

  object.children.push(component);

  instance.on("draw", () => component.draw(), drawPriority);

  const redrawCanvas = () => instance.emitter.emit("draw");
  instance.on("focus", redrawCanvas);
  instance.on("active", redrawCanvas);
  instance.emitter.emit("draw");

  return component;
}
