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
import { AnyComponent, Dynamic, Reader, Writer } from "./types.ts";
import { getStaticValue } from "./util.ts";

const timeoutHandle: { [id: number]: number } = {};
export function draw(
  instance: Tui,
  refreshRate: Dynamic<number> = 32,
): (() => void) {
  drawRectangle(instance.canvas, {
    ...instance.rectangle,
    styler: instance.styler,
  });

  for (const component of instance.components) {
    component.update();
    component.draw();
    component.emit("draw", Date.now());
  }

  render(instance.canvas);
  instance.emit("draw", Date.now());
  instance.focused.active = false;

  timeoutHandle[instance.id] = setTimeout(
    () => draw(instance, refreshRate),
    getStaticValue(refreshRate) - instance.canvas.deltaTime,
  );

  return () => clearTimeout(timeoutHandle[instance.id]);
}

/** Definition on how Tui or TuiComponent should look like */
export interface Styler extends CanvasStyler {
  active?: CanvasStyler;
  focused?: CanvasStyler;
}

export interface Rectangle {
  column: number;
  row: number;

  width: number;
  height: number;
}

export interface PrivateTui extends Tui {
  readonly emitter:
    & EventEmitter<"key", KeyPress>
    & EventEmitter<"mouse", MousePress>
    & EventEmitter<"multiKey", MultiKeyPress>
    & EventEmitter<"focus" | "active", undefined>
    & EventEmitter<"draw", number>
    & EventEmitter<"createComponent" | "removeComponent", AnyComponent>;
}

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

  readonly styler: Styler;
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
  styler: Styler;
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
