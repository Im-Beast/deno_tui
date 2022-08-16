// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Canvas } from "./canvas.ts";
import { Component } from "./component.ts";
import { ComponentEvent, KeypressEvent, MousePressEvent, MultiKeyPressEvent, RenderEvent } from "./events.ts";
import { emptyStyle, Style } from "./theme.ts";

import { CombinedAsyncIterator } from "./utils/combined_async_iterator.ts";
import { sleep } from "./utils/async.ts";
import { SortedArray } from "./utils/sorted_array.ts";
import { TypedEventTarget } from "./utils/typed_event_target.ts";
import {
  CLEAR_SCREEN,
  HIDE_CURSOR,
  SHOW_CURSOR,
  USE_PRIMARY_BUFFER,
  USE_SECONDARY_BUFFER,
} from "./utils/ansi_codes.ts";

import type { Stdin, Stdout, Timing } from "./types.ts";

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
  render: RenderEvent;
  update: Event;
  keyPress: KeypressEvent;
  multiKeyPress: MultiKeyPressEvent;
  mousePress: MousePressEvent;
  close: CustomEvent<"close">;
  addComponent: ComponentEvent<"addComponent">;
  removeComponent: ComponentEvent<"removeComponent">;
};

/** Main object of Tui that contains everything keeping it running */
export class Tui extends TypedEventTarget<TuiEventMap> implements TuiImplementation {
  canvas: Canvas;
  stdin: Stdin;
  stdout: Stdout;
  style: Style;
  components: SortedArray<Component>;
  updateRate: number;

  constructor({ stdin, stdout, canvas, style, updateRate }: TuiOptions) {
    super();

    this.stdin = stdin ?? Deno.stdin;
    this.stdout = stdout ?? Deno.stdout;
    this.style = style ?? emptyStyle;
    this.components = new SortedArray((a, b) => a.zIndex - b.zIndex);

    this.canvas = canvas ?? new Canvas({
      refreshRate: 16,
      stdout: this.stdout,
    });

    this.updateRate = updateRate ?? this.canvas.refreshRate;

    const closeEventDispatcher = () => {
      this.dispatchEvent(new CustomEvent("close"));
    };

    // Dispatch "close" event when Tui should be stopped
    addEventListener("unload", closeEventDispatcher);
    Deno.addSignalListener("SIGINT", closeEventDispatcher);

    if (Deno.build.os === "windows") {
      Deno.addSignalListener("SIGBREAK", closeEventDispatcher);

      this.addEventListener("keyPress", ({ keyPress: { key, ctrl } }) => {
        if (key === "c" && ctrl) closeEventDispatcher();
      });
    } else {
      Deno.addSignalListener("SIGTERM", closeEventDispatcher);
    }

    // Handle "close" event
    this.addEventListener("close", () => {
      Deno.writeSync(this.stdout.rid, textEncoder.encode(SHOW_CURSOR + USE_PRIMARY_BUFFER));

      // Delay exiting from app so it's possible to attach anywhere else to "close" event
      queueMicrotask(() => {
        Deno.exit(0);
      });
    });
  }

  /** Async generator that dispatches "update" event */
  async *update(): AsyncGenerator<{ type: "update" }> {
    while (true) {
      this.dispatchEvent(new CustomEvent("update"));
      yield { type: "update" };
      await sleep(this.updateRate);
    }
  }

  /** Async generator that dispatches "render" event */
  async *render(): AsyncGenerator<{ type: "render"; timing: Timing }> {
    for await (const timing of this.canvas.render()) {
      this.dispatchEvent(new CustomEvent("render", { detail: { timing } }));
      yield { type: "render", timing };
    }
  }

  /**
   *  Async generator that handles "update" and "render" events
   *   - on "update" event it renders background using `tui.style`.
   *   Then it calls `draw()` on every component in `tui.components`
   */
  async *run(): AsyncGenerator<{ type: "render"; timing: Timing } | { type: "update" }> {
    Deno.writeSync(this.stdout.rid, textEncoder.encode(USE_SECONDARY_BUFFER + HIDE_CURSOR + CLEAR_SCREEN));

    const iterator = new CombinedAsyncIterator<
      { type: "render"; timing: Timing } | { type: "update" }
    >(this.update(), this.render());

    for await (const event of iterator) {
      if (event.type === "update") {
        const { columns, rows } = this.canvas.size;
        this.canvas.draw(0, 0, this.style((" ".repeat(columns) + "\n").repeat(rows)));

        for (const component of this.components) {
          component.draw();
        }
      }

      yield event;
    }
  }
}
