// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { CanvasResizeEvent, FrameEvent, RenderEvent } from "./events.ts";
import { Timing } from "./types.ts";

import { sleep } from "./utils/async.ts";
import { textWidth } from "./utils/strings.ts";
import { moveCursor } from "./utils/ansi_codes.ts";
import { fits, fitsInRectangle } from "./utils/numbers.ts";
import { TypedEventTarget } from "./utils/typed_event_target.ts";
import { isFullWidth, stripStyles, UNICODE_CHAR_REGEXP } from "./utils/strings.ts";

import type { ConsoleSize, Rectangle, Stdout } from "./types.ts";

const textEncoder = new TextEncoder();

export interface CanvasOptions {
  /** How often canvas tries to find differences in its frameBuffer and render */
  refreshRate: number;
  /** Stdout to which canvas will render frameBuffer */
  stdout: Stdout;
}

export type CanvasEventMap = {
  "render": RenderEvent;
  "frame": FrameEvent;
  "resize": CanvasResizeEvent;
};

export class Canvas extends TypedEventTarget<CanvasEventMap> {
  size: ConsoleSize;
  refreshRate: number;
  stdout: Stdout;
  frameBuffer: string[][];
  previousFrameBuffer: this["frameBuffer"];
  lastRender: number;
  fps: number;

  constructor({ refreshRate, stdout }: CanvasOptions) {
    super();

    this.refreshRate = refreshRate;
    this.stdout = stdout;
    this.frameBuffer = [];
    this.previousFrameBuffer = [];
    this.fps = 0;
    this.lastRender = 0;
    this.size = Deno.consoleSize(this.stdout.rid);

    switch (Deno.build.os) {
      case "windows":
        this.addEventListener("render", ({ timing }) => {
          if (timing !== Timing.Pre) return;
          this.resizeCanvas(Deno.consoleSize(this.stdout.rid));
        });
        break;
      default:
        Deno.addSignalListener("SIGWINCH", () => {
          this.resizeCanvas(Deno.consoleSize(this.stdout.rid));
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
    this.dispatchEvent(new CanvasResizeEvent(size));
  }

  /**
   * Render value starting on column and row on canvas
   *
   * When rectangle is given:
   * If particular part of the rendering doesn't fit within rectangle boundaries then it's not drawn
   */
  draw(column: number, row: number, value: string, rectangle?: Rectangle): void {
    if (typeof value !== "string" || value.length === 0 || typeof column !== "number" || typeof row !== "number") {
      return;
    }

    column = ~~column;
    row = ~~row;

    const stripped = stripStyles(value);

    if (stripped.length === 0) return;

    const frameBufferRow = this.frameBuffer[row] ||= [];

    if (stripped.length === 1) {
      if (!fitsInRectangle(column, row, rectangle)) return;

      frameBufferRow[column] = value;
      if (frameBufferRow[column + 1] === undefined) {
        const style = value.replace(stripped, "").replaceAll("\x1b[0m", "");
        frameBufferRow[column + 1] = `${style} \x1b[0m`;
      }
      return;
    }

    const distinctStyles = value
      .replace(stripped, "")
      .split("\x1b[0m")
      .filter((v) => v.length > 0);

    if (distinctStyles.length > 1) {
      for (const [i, style] of distinctStyles.entries()) {
        const previousStyle = distinctStyles?.[i - 1];
        this.draw(column + textWidth(previousStyle), row, style, rectangle);
      }
      return;
    }

    const style = distinctStyles[0] ?? "";

    if (value.includes("\n")) {
      for (const [i, line] of value.split("\n").entries()) {
        this.draw(column, row + i, style + line + "\x1b[0m", rectangle);
      }
      return;
    }

    const realCharacters = stripped.match(UNICODE_CHAR_REGEXP);
    if (!realCharacters?.length) return;

    if (rectangle && !fits(row, rectangle.row, rectangle.row + rectangle.height)) return;

    let offset = 0;
    for (const character of realCharacters) {
      const offsetColumn = column + offset;

      if (rectangle && !fits(offsetColumn, rectangle.column, rectangle.column + rectangle.width)) {
        offset += isFullWidth(character) ? 2 : 1;
        continue;
      }

      frameBufferRow[offsetColumn] = `${style}${character}\x1b[0m`;
      if (isFullWidth(character)) {
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
    this.dispatchEvent(new RenderEvent(Timing.Pre));

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

    this.dispatchEvent(new RenderEvent(Timing.Post));
  }

  /**
   * Runs a loop in which it checks whether frameBuffer has changed (anything new has been drawn).
   * If so, run `renderFrame()` with current frame buffer and in the way yield and emit proper events.
   * On each iteration it sleeps for adjusted `refreshRate` time.
   */
  async *render() {
    while (true) {
      let deltaTime = performance.now();
      this.fps = 1000 / (performance.now() - this.lastRender);

      if (this.lastRender === 0 || JSON.stringify(this.frameBuffer) !== JSON.stringify(this.previousFrameBuffer)) {
        yield Timing.Pre;
        this.dispatchEvent(new FrameEvent(Timing.Pre));

        this.renderFrame(this.frameBuffer);

        yield Timing.Post;
        this.dispatchEvent(new FrameEvent(Timing.Post));
      }

      deltaTime -= performance.now();
      await sleep(this.refreshRate + deltaTime);
    }
  }
}
