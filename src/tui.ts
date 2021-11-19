import { CanvasInstance, createCanvas, draw, drawRectangle } from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { KeyPress, MultiKeyPress } from "./key_reader.ts";
import { AnyComponent } from "./types.ts";
import {
  ConsoleSize,
  Dynamic,
  Reader,
  TuiRectangle,
  TuiStyler,
  Writer,
} from "./types.ts";

export interface TuiInstance {
  readonly id: number;
  readonly emitter:
    & EventEmitter<"key", KeyPress>
    & EventEmitter<"multiKey", MultiKeyPress>
    & EventEmitter<"focus" | "active", undefined>;
  readonly on: TuiInstance["emitter"]["on"];
  readonly off: TuiInstance["emitter"]["off"];
  readonly once: TuiInstance["emitter"]["once"];
  readonly draw: () => void;
  readonly stopDrawing: () => void;
  rectangle: () => TuiRectangle;
  children: AnyComponent[];
  components: AnyComponent[];
  selected: {
    item?: AnyComponent;
    focused: boolean;
    active: boolean;
  };
  canvas: CanvasInstance;
  reader: Reader;
  writer: Writer;
}

export interface CreateTuiOptions {
  styler: TuiStyler;
  filler?: string;
  size?: Dynamic<ConsoleSize>;
  refreshRate?: Dynamic<number>;
}

let instanceId = 0;
export function createTui(
  reader: Reader,
  writer: Writer,
  { styler, filler, size, refreshRate = 16 }: CreateTuiOptions,
): TuiInstance {
  const canvas = createCanvas({
    writer,
    styler,
    filler,
    size,
  });

  const emitter = createEventEmitter() as TuiInstance["emitter"];

  const tui: TuiInstance = {
    id: instanceId++,
    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    draw() {
      drawRectangle(tui.canvas, {
        ...tui.rectangle(),
        styler,
      });

      const drawComponents = tui.components.sort((b, a) =>
        b.drawPriority - a.drawPriority
      );

      for (const component of drawComponents) {
        component.draw();
      }

      draw(canvas);
    },
    stopDrawing() {
      clearInterval(intervalId);
    },
    rectangle: () => ({
      column: 0,
      row: 0,
      width: canvas.frameBuffer.columns,
      height: canvas.frameBuffer.rows,
    }),
    children: [],
    components: [],
    selected: {
      active: false,
      focused: false,
      item: undefined,
    },
    canvas,
    reader,
    writer,
  };

  let intervalId: number;
  const restartInterval = () => {
    if (intervalId) clearInterval(intervalId);
    const dynamicRR = typeof refreshRate === "function";
    let lastRR: number;
    setInterval(
      dynamicRR
        ? () => {
          tui.draw();
          const rr = refreshRate();
          if (lastRR && lastRR !== rr) {
            restartInterval();
          }
        }
        : tui.draw,
      dynamicRR ? refreshRate() : refreshRate,
    );
  };

  restartInterval();

  return tui;
}
