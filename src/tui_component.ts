import { CanvasInstance } from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { KeyPress } from "./key_reader.ts";
import { TuiInstance } from "./tui.ts";
import { TuiRectangle, TuiStyler } from "./types.ts";

export function getInstance(object: TuiInstance | AnyComponent) {
  return Object.hasOwn(object, "instance")
    ? (<TuiComponent> object).instance
    : object as TuiInstance;
}

export type GetCurrentStylerOptions = {
  focused?: {
    value: boolean;
    force?: boolean;
  };
  active?: {
    value: boolean;
    force?: boolean;
  };
};
export function getCurrentStyler(
  component: AnyComponent,
  override?: GetCurrentStylerOptions,
) {
  const { styler } = component;
  const { focused, isActive } = component.instance.components;

  const isFocused = override?.focused ||
    !override?.focused?.force && (focused.id === component.id ||
        component.components.focusedWithin.some((c) => c.id === focused.id));

  return (isFocused &&
      (override?.active?.value || !override?.active?.force && isActive)
    ? styler.active || styler.focused
    : isFocused
    ? styler.focused
    : styler) || styler;
}

export type TuiComponent<Events = void, Attributes = void> = {
  readonly id: number;
  readonly name: string;
  canvas: CanvasInstance;
  interactive: boolean;
  instance: TuiInstance;
  rectangle: TuiRectangle;
  emitter:
    & EventEmitter<"keyPress", KeyPress>
    & EventEmitter<"redraw" | "focus" | "active", undefined>
    & EventEmitter<Events extends string ? Events : never, Attributes>;
  components: {
    focusedWithin: AnyComponent[];
    father: {
      components: {
        tree: AnyComponent[];
      };
    };
    tree: AnyComponent[];
  };
  styler: TuiStyler;
  on: TuiComponent<Events, Attributes>["emitter"]["on"];
  off: TuiComponent<Events, Attributes>["emitter"]["off"];
  once: TuiComponent<Events, Attributes>["emitter"]["once"];
  draw: () => void;
};

// deno-lint-ignore no-explicit-any
export type AnyComponent = TuiComponent<any, any>;

export type CreateComponentOptions = {
  name: string;
  styler: TuiStyler;
  rectangle: TuiRectangle;
  interactive: boolean;
  focusedWithin: AnyComponent[];
  draw?: () => void;
};

let componentId = 0;
export function createComponent<Events = void, Attributes = void>(
  object: TuiInstance | AnyComponent,
  { name, interactive, styler, rectangle, focusedWithin, draw }:
    CreateComponentOptions,
): TuiComponent<Events, Attributes> {
  const emitter = createEventEmitter() as TuiComponent<
    Events,
    Attributes
  >["emitter"];

  const instance = getInstance(object);

  const component: TuiComponent<Events, Attributes> = {
    name,
    instance,
    interactive,
    id: componentId++,
    canvas: instance.canvas,
    styler,
    rectangle,
    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    components: {
      focusedWithin: focusedWithin || [],
      father: object,
      tree: [],
    },
    draw: draw || (() => {}),
  };

  if (component.interactive) {
    const { column, row } = component.rectangle;
    const { focusMap } = instance.components;
    focusMap[row] ||= [];
    focusMap[row][column] ||= [];
    focusMap[row][column].push(component);

    const mapping: AnyComponent[][] = [];

    const isNotNaN = (n: unknown) => !Number.isNaN(n);

    const rows = (Object.getOwnPropertyNames(focusMap).map(Number))
      .sort((a, b) => a - b).filter(isNotNaN);

    rows.forEach((row, r) => {
      mapping[r] ||= [];

      const columns = (Object.getOwnPropertyNames(focusMap[row]).map(Number))
        .sort((a, b) => a - b).filter(isNotNaN);

      columns.forEach((column) => {
        const components = focusMap[row][column];
        mapping[r].push(...components);
      });
    });

    focusMap.mapping = mapping;
  }

  object.components.tree.push(component);

  instance.on("draw", component.draw);
  component.on("redraw", component.draw);

  const redrawCanvas = () => {
    component.emitter.emit("redraw");
    instance.emitter.emit("draw");
  };

  component.on("focus", redrawCanvas);
  component.on("active", redrawCanvas);

  redrawCanvas();

  return component;
}
