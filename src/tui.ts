import {
  CanvasInstance,
  createCanvas,
  draw,
  drawRectangle,
  loop,
} from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { KeyPress, MultiKeyPress } from "./key_reader.ts";
import { AnyComponent } from "./tui_component.ts";
import { Reader, StaticTuiRectangle, TuiStyler, Writer } from "./types.ts";

export interface TuiInstance {
  readonly id: number;
  readonly emitter:
    & EventEmitter<"key", KeyPress>
    & EventEmitter<"multiKey", MultiKeyPress>
    & EventEmitter<"focus" | "active", undefined>;
  draw: () => void;
  reader: Reader;
  writer: Writer;
  rectangle: StaticTuiRectangle;
  children: AnyComponent[];
  interactiveComponents: AnyComponent[];
  allComponents: AnyComponent[];
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
    allComponents: [],
    selected: {
      active: false,
      focused: false,
      item: undefined,
    },
    canvas,
    emitter,
    draw: () => draw(canvas),
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
  };

  loop(tui.canvas, 16, () => {
    drawRectangle(tui.canvas, {
      ...tui.rectangle,
      styler,
    });

    const drawComps = tui.allComponents.sort((b, a) =>
      b.drawPriority - a.drawPriority
    );

    for (const { draw } of drawComps) {
      draw();
    }
  });

  return tui;
}
