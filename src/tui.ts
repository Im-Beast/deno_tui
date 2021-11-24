import {
  CanvasInstance,
  createCanvas,
  drawRectangle,
  drawText,
  render,
} from "./canvas.ts";
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
import { getStaticValue } from "./util.ts";

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
  styler: Dynamic<TuiStyler>;
  canvas: CanvasInstance;
  reader: Reader;
  writer: Writer;
  size: Dynamic<ConsoleSize>;
}

export type CreateTuiOptions = {
  styler: TuiStyler;
  refreshRate?: Dynamic<number>;
  size?: Dynamic<ConsoleSize>;
} & (CreateTuiOptionsWithCanvas | CreateTuiOptionsWithoutCanvas);

export interface CreateTuiOptionsWithCanvas {
  canvas: CanvasInstance;
  filler?: never;
}

export interface CreateTuiOptionsWithoutCanvas {
  canvas?: never;
  filler?: string;
}

let instanceId = 0;
export function createTui(
  reader: Reader,
  writer: Writer,
  {
    styler,
    filler,
    refreshRate = 16,
    size,
    canvas = createCanvas({
      writer,
      styler,
      filler,
      size,
    }),
  }: CreateTuiOptions,
): TuiInstance {
  const emitter = createEventEmitter() as TuiInstance["emitter"];

  const tui: TuiInstance = {
    id: instanceId++,
    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    styler,
    size: size || (() => getStaticValue(tui.canvas.size)),
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

      const fpsText = `FPS: ${tui.canvas.fps.toFixed(2)}`;

      drawText(tui.canvas, {
        column: tui.rectangle().width - fpsText.length,
        row: 0,
        text: fpsText,
        styler: {
          foreground: "\x1b[38m",
          background: "\x1b[45m",
        },
      });

      render(tui.canvas);
    },
    stopDrawing() {
      clearInterval(intervalId);
    },
    rectangle() {
      const { columns: width, rows: height } = getStaticValue(tui.size);
      return {
        column: 0,
        row: 0,
        width,
        height,
      };
    },
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
      getStaticValue(refreshRate),
    );
  };

  restartInterval();

  return tui;
}
