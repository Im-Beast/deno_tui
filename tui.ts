import * as Canvas from "./canvas.ts";
import * as Emitter from "./event_emitter.ts";

import { CanvasInstance, CanvasStyler } from "./canvas.ts";
import type { EventEmitter } from "./event_emitter.ts";
import { KeyPress, readKeypresses } from "./key_reader.ts";
import type { Reader, Writer } from "./types.ts";

export type TuiRectangle = {
  column: number;
  row: number;
  width: number;
  height: number;
};

export type TuiStyler<T = void> = CanvasStyler<T> & {
  active?: CanvasStyler<T>;
  focused?: CanvasStyler<T>;
  border?: CanvasStyler<T> & {
    active?: CanvasStyler<T>;
    focused?: CanvasStyler<T>;
  };
};

export type TuiComponent<Events = void, Attributes = void> = {
  id: string;
  canvas: CanvasInstance;
  interactive: boolean;
  instance: TuiInstance;
  rectangle: TuiRectangle;
  emitter: EventEmitter<
    "keyPress" | "redraw" | (Events extends string ? Events : "redraw"),
    KeyPress | undefined | (Attributes extends void ? undefined : Attributes)
  >;
  components: {
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
  id: string;
  canvas: CanvasInstance;
  styler: TuiStyler;
  rectangle: TuiRectangle;
  interactive: boolean;
};

export function createComponent<Events = void, Attributes = void>(
  object: TuiInstance | AnyComponent,
  options: CreateComponentOptions,
): TuiComponent<Events, Attributes> {
  const emitter: TuiComponent<Events, Attributes>["emitter"] = Emitter
    .createEventEmitter();

  const instance = Object.hasOwn(object, "instance")
    ? (<TuiComponent> object).instance
    : object as TuiInstance;

  const component: TuiComponent<Events, Attributes> = {
    instance: instance,
    interactive: options.interactive,
    id: options.id,
    canvas: options.canvas,
    styler: options.styler,
    rectangle: options.rectangle,
    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    components: {
      father: object,
      tree: [],
    },
    draw: () => {},
  };

  if (component.interactive) {
    const { column, row } = component.rectangle;
    instance.components.focusMap[row] ||= {};
    instance.components.focusMap[row][column] ||= [];
    instance.components.focusMap[row][column].push(component);
  }

  object.components.tree.push(component);

  return component;
}

export type TuiInstance = {
  reader: Reader;
  writer: Writer;
  components: {
    reactiveMap: {
      [row: number]: {
        [col: number]: AnyComponent[];
      };
    };
    focusMap: { [row: number]: { [column: number]: AnyComponent[] } };
    focused: AnyComponent | null;
    tree: AnyComponent[];
    active: boolean;
  };
  canvas: CanvasInstance;
  emitter: EventEmitter<"keyPress" | "drawLoop", KeyPress | undefined>;
  on: TuiInstance["emitter"]["on"];
  off: TuiInstance["emitter"]["off"];
  once: TuiInstance["emitter"]["once"];
};

export function createTui(
  reader: Reader,
  writer: Writer,
  styler: TuiStyler,
): TuiInstance {
  const canvas = Canvas.createCanvas(writer, styler);
  Canvas.loop(canvas, 17);

  const emitter: TuiInstance["emitter"] = Emitter.createEventEmitter();

  const tui: TuiInstance = {
    reader,
    writer,
    components: {
      focusMap: {},
      reactiveMap: {},
      focused: null,
      active: false,
      tree: [],
    },
    canvas,
    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
  };

  handleKeyboard(tui);

  return tui;
}

export async function handleKeyboard(instance: TuiInstance) {
  function emit(keyPress: KeyPress) {
    instance.emitter.emit("keyPress", keyPress);
    if (instance.components.focused) {
      instance.components.focused.emitter.emit("keyPress", keyPress);
    }
  }

  for await (const keyPresses of readKeypresses(instance.reader)) {
    keyPresses.forEach(emit);

    if (keyPresses.length > 1) {
      emit({
        key: keyPresses.join("+"),
        buffer: keyPresses[0].buffer,
        ctrl: keyPresses.some((kp) => kp.ctrl),
        meta: keyPresses.some((kp) => kp.meta),
        shift: keyPresses.some((kp) => kp.shift),
      });
    }
  }
}
