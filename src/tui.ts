// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Canvas } from "./canvas.ts";
import { Component } from "./component.ts";
import { emptyStyle, Style } from "./theme.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";

import { sleep } from "./utils/async.ts";
import { SortedArray } from "./utils/sorted_array.ts";
import { Deffered } from "./utils/deffered.ts";
import {
  CLEAR_SCREEN,
  HIDE_CURSOR,
  SHOW_CURSOR,
  USE_PRIMARY_BUFFER,
  USE_SECONDARY_BUFFER,
} from "./utils/ansi_codes.ts";

import type { KeyPress, MousePress, MultiKeyPress, Stdin, Stdout, Timing } from "./types.ts";
import type { EventRecord } from "./event_emitter.ts";

const textEncoder = new TextEncoder();

/** Interface defining object that {Tui}'s constructor can interpret */
export interface TuiOptions {
  /** Tui will use that canvas to draw on the terminal */
  canvas?: Canvas;
  /** Stdin from which tui can read keypresses in `handleKeypresses()`, defaults to `Deno.stdin` */
  stdin?: Stdin;
  /** Stdout to which tui will write when necessary, defaults to `Deno.stdout` */
  stdout?: Stdout;
  /** Style of background drawn by tui */
  style?: Style;
  /** Distinct update rate at which component `draw()` function will be called, defaults to canvas `refreshRate`*/
  updateRate?: number;
}

/** Interface defining what's accessible in {Tui} class */
export interface TuiPrivate {
  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  components: SortedArray<Component>;
  updateRate: number;
}

/** Implementation for {Tui} class */
export type TuiImplementation = TuiOptions & TuiPrivate;

/** EventMap that {Tui} uses */
export type TuiEventMap = {
  render: EmitterEvent<[Timing]>;
  update: EmitterEvent<[]>;
  keyPress: EmitterEvent<[KeyPress]>;
  multiKeyPress: EmitterEvent<[MultiKeyPress]>;
  mousePress: EmitterEvent<[MousePress]>;
  dispatch: EmitterEvent<[]>;
  addComponent: EmitterEvent<[Component<EventRecord>]>;
  removeComponent: EmitterEvent<[Component<EventRecord>]>;
};

/** Main object of Tui that contains everything keeping it running */
export class Tui extends EventEmitter<TuiEventMap> implements TuiImplementation {
  #dispatches: (() => void)[] = [];

  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  style: Style;
  components: SortedArray<Component<EventRecord>>;
  updateRate: number;

  constructor(options: TuiOptions) {
    super();

    this.stdin = options.stdin ?? Deno.stdin;
    this.stdout = options.stdout ?? Deno.stdout;
    this.style = options.style ?? emptyStyle;
    this.components = new SortedArray((a, b) => a.zIndex - b.zIndex);

    this.canvas = options.canvas ?? new Canvas({
      refreshRate: 16,
      stdout: this.stdout,
    });

    this.updateRate = options.updateRate ?? this.canvas.refreshRate;
  }

  /**
   * It does several things:
   *  - Disables all event listeners
   *  - Calls `Component.remove` on every component in `Tui.components`
   *  - Stops `Tui.render()` and `Tui.update()` via `Tui.#dispatches`
   *  - Writes ANSI sequences to stdout which shows back cursor and returns to using primary terminal buffer
   */
  remove(): void {
    this.off();

    for (const dispatch of this.#dispatches) dispatch();
    for (const component of this.components) component.remove();

    Deno.writeSync(this.stdout.rid, textEncoder.encode(SHOW_CURSOR + USE_PRIMARY_BUFFER));
    this.stdin.setRaw(false);
  }

  /**
   * Emits "dispatch" event on signals and keystrokes that should terminate an application
   *  - SIGBREAK
   *  - SIGTERM (not windows)
   *  - SIGINT
   *  - CTRL+C (windows)
   */
  dispatch(): void {
    const closeEventDispatcher = () => this.emit("dispatch");

    switch (Deno.build.os) {
      case "windows":
        Deno.addSignalListener("SIGBREAK", closeEventDispatcher);

        this.on("keyPress", ({ key, ctrl }) => {
          if (key === "c" && ctrl) closeEventDispatcher();
        });
        break;
      default:
        Deno.addSignalListener("SIGTERM", closeEventDispatcher);
        break;
    }

    Deno.addSignalListener("SIGINT", closeEventDispatcher);

    this.on("dispatch", () => {
      this.remove();
      // Delay exiting from app so it's possible to attach anywhere else to "dispatch" event
      queueMicrotask(() => Deno.exit(0));
    });
  }

  /**
   * Generates "update" events in {Tui}
   * Returns function that stops it
   */
  update(): () => void {
    const deffered = new Deffered<void>();

    (async () => {
      while (deffered.state === "pending") {
        this.emit("update");
        await sleep(this.updateRate);
      }
    })();

    return deffered.resolve;
  }

  /**
   * Redirects "frame" event from {Canvas} to "render" event in {Tui}
   * Returns function that stops {Canvas.render}
   */
  render(): () => void {
    this.canvas.on("frame", (timing) => this.emit("render", timing));
    return this.canvas.render();
  }

  /**
   * It does several things:
   *  - Writes ANSI sequences to stdout to use secondary terminal buffer, hide cursor and clear screen
   *  - Calls `Tui.update()` and `Tui.render()`
   *  - On "update" event it renders background using `Tui.style` and calls `Component.draw()` on every component in `Tui.components`
   */
  run(): void {
    Deno.writeSync(this.stdout.rid, textEncoder.encode(USE_SECONDARY_BUFFER + HIDE_CURSOR + CLEAR_SCREEN));

    this.#dispatches.push(
      this.update(),
      this.render(),
    );

    this.on("update", () => {
      const { columns, rows } = this.canvas.size;
      this.canvas.draw(0, 0, this.style((" ".repeat(columns) + "\n").repeat(rows)));

      for (const component of this.components) {
        const { rectangle } = component;
        if (rectangle && (rectangle.column > columns || rectangle.row > rows)) continue;
        component.draw();
      }
    });
  }
}
