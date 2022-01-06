// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  Canvas,
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

/** Whether debugMode is enabled */
export let debugMode = false;

/**
 * Enable/disable debug mode
 *  - when debug mode is enabled tui doesn't render canvas on screen
 */
export function setDebugMode(value: boolean): void {
  debugMode = value;
}

/**
 * Get interactive components from tui
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

/**
 * Render tui and its components every refreshRate ms
 *  - Also emits update and draw events to tui and components
 *  - When debugMode is enabled tui isn't rendered on terminal
 * @param tui - Tui to be rendered
 */
export function loopDrawing(
  tui: Tui,
  refreshRate: Dynamic<number> = 32,
): (() => void) {
  draw(tui);

  timeoutHandle[tui.id] = setTimeout(
    () => loopDrawing(tui, refreshRate),
    getStaticValue(refreshRate) - tui.canvas.deltaTime,
  );

  return () => clearTimeout(timeoutHandle[tui.id]);
}

/**
 * Render tui and its components only once
 *  - Also emits update and draw events to tui and components
 *  - When debugMode is enabled tui isn't rendered on terminal
 * @param tui - Tui to be rendered
 */
export function draw(tui: Tui): void {
  tui.emit("update", Date.now());

  if (!debugMode) {
    drawRectangle(tui.canvas, {
      ...tui.rectangle,
      styler: tui.styler,
    });
  }

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

  if (!debugMode) {
    render(tui.canvas);
  }

  tui.emit("draw", Date.now());
  tui.focused.active = false;
}

/** Definition on how Tui or TuiComponent should look like */
export interface TuiStyler extends CanvasStyler {
  active?: CanvasStyler;
  focused?: CanvasStyler;
}

/** Private properties for Tui */
export interface PrivateTui extends Tui {
  /** TUI's EventEmitter */
  readonly emitter:
    & EventEmitter<"key", KeyPress>
    & EventEmitter<"mouse", MousePress>
    & EventEmitter<"multiKey", MultiKeyPress>
    & EventEmitter<"focus" | "active", undefined>
    & EventEmitter<"draw" | "update", number>
    & EventEmitter<"createComponent" | "removeComponent", AnyComponent>;
}

/** Main object – "root" of tui components */
export interface Tui {
  /** Unique ID for tuis */
  readonly id: number;

  /** Stdin from which tui can read keypresses */
  readonly reader: Reader;
  /** Stdout to which tui will draw by default */
  readonly writer: Writer;

  /** Tui's canvas instance */
  readonly canvas: Canvas;

  /** All components of tui */
  readonly components: AnyComponent[];
  /** Children components of tui */
  readonly children: AnyComponent[];
  /** Information about currently focused item */
  readonly focused: {
    /** Which item is focused */
    item?: AnyComponent;
    /** Whether focused item is active */
    active: boolean;
  };

  /** Definition of tui's look */
  readonly styler: TuiStyler;
  /** Size and position of tui */
  readonly rectangle: Rectangle;

  /** Handle given functions on specific tui events */
  readonly on: PrivateTui["emitter"]["on"];
  /** Handle given functions only once on specific tui events */
  readonly once: PrivateTui["emitter"]["once"];
  /** Disable handling specific functions on tui events */
  readonly off: PrivateTui["emitter"]["off"];
  /** Emit event which will fire functions specified to it */
  readonly emit: PrivateTui["emitter"]["emit"];
}

export interface CreateTuiOptions {
  /** Stdin from which tui can read keypresses */
  reader?: Reader;
  /** Stdout to which tui will draw by default */
  writer?: Writer;
  /** Canvas which will be used for drawing to writer */
  canvas?: Canvas;
  /** Definition of tui's look */
  styler: TuiStyler;
}

let id = 0;
/**
 * Create new tui instance
 *
 * It's root of all other components
 *
 * Components create tree-like structure (by parent/child relationship)
 * @param options
 * @example
 * ```ts
 * const tui = createTui({
 *  reader: Deno.stdin,
 *  writer: Deno.stdout,
 *  styler: {
 *    foreground: "\x1b[32m",
 *    background: "\x1b[43m"
 *  }
 * });
 * ```
 */
export function createTui({
  reader = Deno.stdin,
  writer = Deno.stdout,
  styler,
  canvas = createCanvas({
    writer,
    filler: styleStringFromStyler(" ", styler),
  }),
}: CreateTuiOptions): Tui {
  const emitter = createEventEmitter() as PrivateTui["emitter"];

  const tui: PrivateTui = {
    id: id++,

    reader,
    writer,

    styler,
    get rectangle() {
      const { columns, rows } = canvas.size;

      return {
        column: 0,
        row: 0,
        width: columns,
        height: rows,
      };
    },
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
