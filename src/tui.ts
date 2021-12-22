// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  CanvasInstance,
  createCanvas,
  drawRectangle,
  render,
  styleStringFromStyler,
} from "./canvas.ts";
import { createEventEmitter, EventEmitter } from "./event_emitter.ts";
import { KeyPress, MousePress, MultiKeyPress } from "./key_reader.ts";
import {
  AnyComponent,
  ConsoleSize,
  Dynamic,
  Reader,
  TuiRectangle,
  TuiStyler,
  Writer,
} from "./types.ts";
import { getStaticValue } from "./util.ts";

/**
 * Get interactive components from TuiInstance
 * @param instance – Tui to get components from
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
  instance: TuiInstance,
): AnyComponent[] {
  return instance.components.filter((
    { interactive },
  ) => interactive);
}

const timeoutHandle: { [id: number]: number } = {};

/**
 * Consistently draws TuiInstance.
 * Returns function which stops drawing.
 * @param instance – Tui to be drawn
 * @param refreshRate – How often tui should be redrawn (in ms)
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * const stop = draw(tui);
 * setTimeout(stop, 1000); // -> tui will stop being drawn after 1s
 * ```
 */
export function draw(
  instance: TuiInstance,
  refreshRate: Dynamic<number> = 32,
): () => void {
  drawRectangle(instance.canvas, {
    ...instance.rectangle,
    styler: instance.styler,
  });

  for (const component of instance.components) {
    component.draw();
  }

  render(instance.canvas);
  instance.emitter.emit("draw", Date.now());

  instance.selected.active = false;

  timeoutHandle[instance.id] = setTimeout(
    () => draw(instance, refreshRate),
    getStaticValue(refreshRate) - instance.canvas.deltaTime,
  );

  return () => clearTimeout(timeoutHandle[instance.id]);
}

/** Main object – "root" of Tui */
export interface TuiInstance {
  /** Unique ID for TuiInstance */
  readonly id: number;
  /** TUI's EventEmitter */
  readonly emitter:
    & EventEmitter<"key", KeyPress>
    & EventEmitter<"mouse", MousePress>
    & EventEmitter<"multiKey", MultiKeyPress>
    & EventEmitter<"focus" | "active", undefined>
    & EventEmitter<"draw", number>;
  /** Handle given functions on specific tui events */
  readonly on: TuiInstance["emitter"]["on"];
  /** Handle given functions only once on specific tui events */
  readonly off: TuiInstance["emitter"]["off"];
  /** Disable handling specific functions on tui events */
  readonly once: TuiInstance["emitter"]["once"];
  /** Size and position of tui */
  rectangle: TuiRectangle;
  /** tui's children components */
  children: AnyComponent[];
  /** All of tui's components */
  components: AnyComponent[];
  /** Currently selected item info */
  selected: {
    /** Currently selected item component */
    item?: AnyComponent;
    /** Whether it's focused */
    focused: boolean;
    /** Whether it's active */
    active: boolean;
  };
  /** Definition of tui's look */
  styler: TuiStyler;
  /** Canvas to which tui will draw */
  canvas: CanvasInstance;
  /** Deno.stdin which can be used to read keypresses */
  reader: Reader;
  /** Deno.stdout to which canvas renders by default */
  writer: Writer;
  /** Size of the tui */
  size: ConsoleSize;
}

export type CreateTuiOptions = {
  /** Definition of tui's look */
  styler: TuiStyler;
  /** Size of the tui */
  size?: ConsoleSize;
} & (CreateTuiOptionsWithCanvas | CreateTuiOptionsWithoutCanvas);

interface CreateTuiOptionsWithCanvas {
  /** Canvas to which tui will draw */
  canvas: CanvasInstance;
  filler?: never;
}

interface CreateTuiOptionsWithoutCanvas {
  canvas?: never;
  /** Character which canvas will use to fill empty space */
  filler?: string;
}

let instanceId = 0;

/**
 * Create TuiInstance
 * @param reader - stdin from which tui can read keypresses
 * @param writer - stdout to which tui will draw by default
 * @param options
 */
export function createTui(
  reader: Reader,
  writer: Writer,
  {
    styler,
    filler,
    size,
    canvas = createCanvas({
      writer,
      filler: styleStringFromStyler(filler || " ", styler),
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
    get size() {
      return size ?? getStaticValue(tui.canvas.size);
    },
    get rectangle() {
      const { columns: width, rows: height } = tui.size;
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

  Deno.addSignalListener("SIGINT", () => {
    dispatchEvent(new Event("unload"));
    Deno.exit(0);
  });

  return tui;
}
