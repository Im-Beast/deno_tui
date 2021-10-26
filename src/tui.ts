import { CanvasInstance, createCanvas, draw } from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { KeyPress } from "./key_reader.ts";
import { AnyComponent } from "./tui_component.ts";
import { Reader, TuiStyler, Writer } from "./types.ts";

export type TuiInstance = {
  readonly id: number;
  reader: Reader;
  writer: Writer;
  components: {
    focusMap: {
      mapping: AnyComponent[][];
      [row: number]: {
        [col: number]: AnyComponent[];
      };
    };
    focused: {
      id: number;
      component: AnyComponent | null;
    };
    tree: AnyComponent[];
    isActive: boolean;
  };
  canvas: CanvasInstance;
  emitter: EventEmitter<"keyPress", KeyPress> & EventEmitter<"draw", undefined>;
  on: TuiInstance["emitter"]["on"];
  off: TuiInstance["emitter"]["off"];
  once: TuiInstance["emitter"]["once"];
};

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
    components: {
      focusMap: { mapping: [] },
      focused: {
        id: -1,
        component: null,
      },
      isActive: false,
      tree: [],
    },
    canvas,
    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
  };

  tui.on("draw", () => draw(canvas));
  tui.emitter.emit("draw");

  return tui;
}
