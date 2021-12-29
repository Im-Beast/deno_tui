import {
  CanvasInstance,
  CanvasStyler,
  createCanvas,
  drawRectangle,
  render,
  styleStringFromStyler,
} from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { KeyPress, MousePress, MultiKeyPress } from "./key_reader.ts";
import { AnyComponent, Dynamic, Reader, Rectangle, Writer } from "./types.ts";
import { getStaticValue } from "./util.ts";

/**
 * Get interactive components from TuiInstance
 * @param tui – Tui to get components from
 * @example
 * ```ts
 * const tui = createTui(...);
 * createButton(tui, ...);
 * createCombobox(tui, ...);
 * createBox(tui, ...);
 * ...
 * getInteractiveComponents(tui); // -> array containing button and combobox
 * ```
 */
export function getInteractiveComponents(
  tui: Tui,
): AnyComponent[] {
  return tui.components.filter((
    { interactive },
  ) => interactive);
}
const timeoutHandle: { [id: number]: number } = {};
export function draw(
  tui: Tui,
  refreshRate: Dynamic<number> = 32,
): (() => void) {
  drawRectangle(tui.canvas, {
    ...tui.rectangle,
    styler: tui.styler,
  });

  for (
    const component of tui.components.sort((a, b) =>
      a.drawPriority - b.drawPriority
    )
  ) {
    component.update?.();
    component.emit("update", Date.now());
    component.draw?.();
    component.emit("draw", Date.now());
  }

  render(tui.canvas);
  tui.emit("draw", Date.now());
  tui.focused.active = false;

  timeoutHandle[tui.id] = setTimeout(
    () => draw(tui, refreshRate),
    getStaticValue(refreshRate) - tui.canvas.deltaTime,
  );

  return () => clearTimeout(timeoutHandle[tui.id]);
}

/** Definition on how Tui or TuiComponent should look like */
export interface TuiStyler extends CanvasStyler {
  active?: CanvasStyler;
  focused?: CanvasStyler;
}

/** Private properties for Tui */
export interface PrivateTui extends Tui {
  readonly emitter:
    & EventEmitter<"key", KeyPress>
    & EventEmitter<"mouse", MousePress>
    & EventEmitter<"multiKey", MultiKeyPress>
    & EventEmitter<"focus" | "active", undefined>
    & EventEmitter<"draw" | "update", number>
    & EventEmitter<"createComponent" | "removeComponent", AnyComponent>;
}

/** Main object – "root" of Tui */
export interface Tui {
  readonly id: number;

  readonly reader: Reader;
  readonly writer: Writer;

  readonly canvas: CanvasInstance;

  readonly components: AnyComponent[];
  readonly children: AnyComponent[];
  readonly focused: {
    item?: AnyComponent;
    active: boolean;
  };

  readonly styler: TuiStyler;
  readonly rectangle: Rectangle;

  readonly on: PrivateTui["emitter"]["on"];
  readonly once: PrivateTui["emitter"]["once"];
  readonly off: PrivateTui["emitter"]["off"];
  readonly emit: PrivateTui["emitter"]["emit"];
}

export interface CreateTuiOptions {
  reader?: Reader;
  writer?: Writer;
  rectangle?: Rectangle;
  canvas?: CanvasInstance;
  styler: TuiStyler;
}

let id = 0;
export function createTui({
  reader = Deno.stdin,
  writer = Deno.stdout,
  rectangle = function () {
    const { columns: width, rows: height } = Deno.consoleSize(writer.rid);

    return {
      column: 0,
      row: 0,
      width,
      height,
    };
  }(),
  styler,
  canvas = createCanvas({
    writer,
    filler: styleStringFromStyler(" ", styler),
    size: {
      columns: rectangle!.width,
      rows: rectangle!.height,
    },
  }),
}: CreateTuiOptions): Tui {
  const emitter = createEventEmitter() as PrivateTui["emitter"];

  const tui: PrivateTui = {
    id: id++,

    reader,
    writer,

    styler,
    rectangle,
    canvas,

    emitter,
    on: emitter.on,
    once: emitter.once,
    off: emitter.off,
    emit: emitter.emit,

    components: [],
    children: [],
    focused: {
      item: undefined,
      active: false,
    },
  };

  Deno.addSignalListener("SIGINT", () => {
    dispatchEvent(new Event("unload"));
    Deno.exit(0);
  });

  return tui;
}
