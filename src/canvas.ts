// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { EmitterEvent, EventEmitter } from "./event_emitter.ts";
import { Timing } from "./types.ts";

import { sleep } from "./utils/async.ts";
import { textWidth } from "./utils/strings.ts";
import { Deffered } from "./utils/deffered.ts";
import { moveCursor } from "./utils/ansi_codes.ts";
import { fits, fitsInRectangle } from "./utils/numbers.ts";
import { isFullWidth, stripStyles, UNICODE_CHAR_REGEXP } from "./utils/strings.ts";

import type { ConsoleSize, Rectangle, Stdout } from "./types.ts";
import type { View } from "./view.ts";
import type { Component } from "./component.ts";

const textEncoder = new TextEncoder();

export interface CanvasDrawOptions {
  boundary?: Rectangle;
  view?: View;
}

/** Interface defining object that {Canvas}'s constructor can interpret */
export interface CanvasOptions {
  /** How often canvas tries to find differences in its frameBuffer and render */
  refreshRate: number;
  /** Stdout to which canvas will render frameBuffer */
  stdout: Stdout;
}

/** Map that contains events that {Canvas} can dispatch */
export type CanvasEventMap = {
  render: EmitterEvent<[Timing]>;
  frame: EmitterEvent<[Timing]>;
  resize: EmitterEvent<[ConsoleSize]>;
};

/** Canvas implementation that can be drawn onto and then rendered on terminal screen */
export class Canvas extends EventEmitter<CanvasEventMap> {
  size: ConsoleSize;
  refreshRate: number;
  stdout: Stdout;
  frameBuffer: string[][];
  previousFrameBuffer: this["frameBuffer"];
  lastRender: number;
  fps: number;

  constructor(options: CanvasOptions) {
    super();

    this.refreshRate = options.refreshRate;
    this.stdout = options.stdout;
    this.frameBuffer = [];
    this.previousFrameBuffer = [];
    this.fps = 0;
    this.lastRender = 0;
    this.size = Deno.consoleSize();

    switch (Deno.build.os) {
      case "windows":
        this.on("render", (timing) => {
          if (timing !== Timing.Pre) return;
          this.resizeCanvas(Deno.consoleSize());
        });
        break;
      default:
        Deno.addSignalListener("SIGWINCH", () => {
          this.resizeCanvas(Deno.consoleSize());
        });
        break;
    }
  }

  /**
   * Change `size` property, then clear `frameBuffer` and `previousFrameBuffer` to force re-render all of the canvas
   * If `size` parameter matches canvas's `size` property then nothing happens
   */
  resizeCanvas(size: ConsoleSize): void {
    const { columns, rows } = this.size;
    if (size.columns === columns && size.rows === rows) return;

    this.size = size;
    this.frameBuffer = [];
    this.previousFrameBuffer = [];
    this.emit("resize", size);
  }

  draw(column: number, row: number, value: string, options?: CanvasDrawOptions): void;
  draw(column: number, row: number, value: string, component?: Component): void;
  draw(column: number, row: number, value: string, options?: Component & CanvasDrawOptions): void {
    if (!value || value.length === 0) return;

    column = ~~column;
    row = ~~row;

    let currentColumn = column;
    let currentRow = row;

    const stripped = stripStyles(value);
    if (stripped.length === 0) return;

    if (options?.view) {
      const { rectangle, offset } = options.view;
      currentColumn += rectangle.column - offset.x;
      currentRow += rectangle.row - offset.y;

      if (options.boundary) {
        const { boundary } = options;

        options.boundary = {
          column: Math.min(boundary.column, rectangle.column),
          row: Math.min(boundary.row, rectangle.row),
          width: Math.min(boundary.width, rectangle.width - 1),
          height: Math.min(boundary.height, rectangle.height - 1),
        };
      } else {
        options.boundary = options.view.rectangle;
      }
    }

    const frameBufferRow = this.frameBuffer[currentRow] ||= [];

    if (stripped.length === 1) {
      if (options?.boundary && !fitsInRectangle(currentColumn, currentRow, options.boundary)) {
        return;
      }

      frameBufferRow[currentColumn] = value;

      if (frameBufferRow[currentColumn + 1] === undefined) {
        const style = value.replace(stripped, "").replaceAll("\x1b[0m", "");
        frameBufferRow[currentColumn + 1] = `${style} \x1b[0m`;
      }
      return;
    }

    const diffStyles = value.split("\x1b[0m").filter(Boolean);

    if (diffStyles.length > 1) {
      let lastWidth = 0;
      for (const value of diffStyles) {
        this.draw(column + lastWidth, row, value, options);
        lastWidth = textWidth(value);
      }
      return;
    }

    const style = diffStyles[0].replace(stripped, "");

    if (value.includes("\n")) {
      for (const [i, line] of value.split("\n").entries()) {
        this.draw(column, row + i, style + line + "\x1b[0m", options);
      }
      return;
    }

    if (options?.boundary && !fits(currentRow, options.boundary.row, options.boundary.row + options.boundary.height)) {
      return;
    }

    const realCharacters = stripped.match(UNICODE_CHAR_REGEXP);
    if (!realCharacters?.length) return;

    let offset = 0;
    for (const character of realCharacters) {
      const offsetColumn = currentColumn + offset;
      const fullWidth = isFullWidth(character);

      if (
        options?.boundary &&
        !fits(offsetColumn, options.boundary.column, options.boundary.column + options.boundary.width)
      ) {
        offset += fullWidth ? 2 : 1;
        continue;
      }

      frameBufferRow[offsetColumn] = `${style}${character}\x1b[0m`;
      if (fullWidth) {
        delete frameBufferRow[offsetColumn + 1];
        ++offset;
      } else if (offsetColumn + 1 < frameBufferRow.length) {
        frameBufferRow[offsetColumn + 1] ??= `${style} \x1b[0m`;
      }

      ++offset;
    }
  }

  /**
   * Checks for individual row and column changes in canvas, then renders just the changes.
   * In the way yield and emit proper events.
   */
  renderFrame(frame: string[][]): void {
    this.emit("render", Timing.Pre);

    const { previousFrameBuffer, size } = this;

    rows:
    for (let r = 0; r < frame.length; ++r) {
      if (r >= size.rows) break rows;

      const previousRow = previousFrameBuffer[r];
      const row = this.frameBuffer[r];

      if (JSON.stringify(previousRow) === JSON.stringify(row)) {
        continue rows;
      }

      columns:
      for (let c = 0; c < row.length; ++c) {
        if (c >= size.columns) continue rows;

        const column = row[c];
        if (previousRow?.[c] === column) continue columns;

        Deno.writeSync(
          this.stdout.rid,
          textEncoder.encode(moveCursor(r, c) + column),
        );
      }
    }

    this.lastRender = performance.now();
    this.previousFrameBuffer = structuredClone(frame);

    this.emit("render", Timing.Post);
  }

  /**
   * Runs a loop in which it checks whether frameBuffer has changed (anything new has been drawn).
   * If so, run `renderFrame()` with current frame buffer and in the way yield and emit proper events.
   * On each iteration it sleeps for adjusted `refreshRate` time.
   */
  render(): () => void {
    const deffered = new Deffered<void>();

    (async () => {
      while (deffered.state === "pending") {
        let deltaTime = performance.now();
        this.fps = 1000 / (performance.now() - this.lastRender);

        if (this.lastRender === 0 || JSON.stringify(this.frameBuffer) !== JSON.stringify(this.previousFrameBuffer)) {
          this.emit("frame", Timing.Pre);
          this.renderFrame(this.frameBuffer);
          this.emit("frame", Timing.Post);
        }

        deltaTime -= performance.now();
        await sleep(this.refreshRate + deltaTime);
      }
    })();

    return deffered.resolve;
  }
}
