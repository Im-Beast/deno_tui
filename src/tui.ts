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
 * Get interactive components
 * @param instance – Tui to get components from
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
 */
export function draw(instance: TuiInstance): () => void {
  drawRectangle(instance.canvas, {
    ...instance.rectangle(),
    styler: getStaticValue(instance.styler),
  });

  for (const component of instance.components) {
    component.draw();
  }

  render(instance.canvas);

  instance.selected.active = false;

  timeoutHandle[instance.id] = setTimeout(
    () => draw(instance),
    getStaticValue(instance.refreshRate) - instance.canvas.deltaTime,
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
    & EventEmitter<"focus" | "active", undefined>;
  /** Handle given functions on specific tui events */
  readonly on: TuiInstance["emitter"]["on"];
  /** Handle given functions only once on specific tui events */
  readonly off: TuiInstance["emitter"]["off"];
  /** Disable handling specific functions on tui events */
  readonly once: TuiInstance["emitter"]["once"];
  /** Size and position of tui */
  rectangle: () => TuiRectangle;
  /** How often tui should be redrawn (in ms) */
  refreshRate: Dynamic<number>;
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
  styler: Dynamic<TuiStyler>;
  /** Canvas to which tui will draw */
  canvas: CanvasInstance;
  /** Deno.stdin which can be used to read keypresses */
  reader: Reader;
  /** Deno.stdout to which canvas renders by default */
  writer: Writer;
  /** Size of the tui */
  size: Dynamic<ConsoleSize>;
}

export type CreateTuiOptions = {
  /** Definition of tui's look */
  styler: TuiStyler;
  /** How often tui should be redrawn (in ms) */
  refreshRate?: Dynamic<number>;
  /** Size of the tui */
  size?: Dynamic<ConsoleSize>;
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
    refreshRate = 32,
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
    size: size || (() => getStaticValue(tui.canvas.size)),
    rectangle() {
      const { columns: width, rows: height } = getStaticValue(tui.size);
      return {
        column: 0,
        row: 0,
        width,
        height,
      };
    },
    refreshRate,
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
    Deno.exit(0);
  });

  return tui;
}
