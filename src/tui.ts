import { CanvasInstance, createCanvas, draw, drawRectangle } from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { KeyPress, MultiKeyPress } from "./key_reader.ts";
import { AnyComponent } from "./tui_component.ts";
import { Reader, TuiRectangle, TuiStyler, Writer } from "./types.ts";

export interface TuiInstance {
  readonly id: number;
  readonly emitter:
    & EventEmitter<"key", KeyPress>
    & EventEmitter<"multiKey", MultiKeyPress>
    & EventEmitter<"draw" | "focus" | "active", undefined>;
  reader: Reader;
  writer: Writer;
  rectangle: TuiRectangle;
  children: AnyComponent[];
  interactiveComponents: AnyComponent[];
  selected: {
    item?: AnyComponent;
    focused: boolean;
    active: boolean;
  };
  canvas: CanvasInstance;
  on: TuiInstance["emitter"]["on"];
  off: TuiInstance["emitter"]["off"];
  once: TuiInstance["emitter"]["once"];
}

let instanceId = 0;
export function createTui(
  reader: Reader,
  writer: Writer,
  styler: TuiStyler,
): TuiInstance {
  const canvas = createCanvas(writer, styler);

  const emitter = createEventEmitter() as TuiInstance["emitter"];

  const tui: TuiInstance = {
    id: instanceId++,
    reader,
    writer,
    get rectangle() {
      return {
        column: 0,
        row: 0,
        width: canvas.frameBuffer.columns,
        height: canvas.frameBuffer.rows,
      };
    },
    children: [],
    interactiveComponents: [],
    selected: {
      active: false,
      focused: false,
      item: undefined,
    },
    canvas,
    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
  };

  tui.on("draw", () =>
    drawRectangle(tui.canvas, {
      ...tui.rectangle,
      styler,
    }), -Infinity);
  tui.on("draw", () => draw(canvas), Infinity);
  tui.emitter.emit("draw");

  return tui;
}
