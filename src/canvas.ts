// Copyright 2022 Im-Beast. All rights reserved. MIT license.
import { CLEAR_SCREEN, HIDE_CURSOR, moveCursor } from "./ansi_codes.ts";
import type { ConsoleSize, Rectangle, Stdout } from "./types.ts";
import { CanvasResizeEvent, FrameEvent, RenderEvent } from "./events.ts";

import { isFullWidth, stripStyles, UNICODE_CHAR_REGEXP } from "./utils/strings.ts";
import { fits, fitsInRectangle } from "./utils/numbers.ts";
import { sleep } from "./utils/async.ts";
import { textWidth } from "./utils/strings.ts";
import { Timing } from "./types.ts";
import { TypedEventTarget } from "./utils/typed_event_target.ts";

const textEncoder = new TextEncoder();

export interface CanvasSize {
  columns: number;
  rows: number;
}

export interface CanvasOptions {
  size: CanvasSize;
  refreshRate: number;
  stdout: Stdout;
}

export type CanvasEventMap = {
  "render": RenderEvent;
  "frame": FrameEvent;
  "resize": CanvasResizeEvent;
};

export class Canvas extends TypedEventTarget<CanvasEventMap> {
  size: CanvasSize;
  refreshRate: number;
  stdout: Stdout;
  frameBuffer: string[][];
  previousFrameBuffer: this["frameBuffer"];
  lastRender: number;
  fps: number;

  constructor({ size, refreshRate, stdout }: CanvasOptions) {
    super();

    this.size = size;
    this.refreshRate = refreshRate;
    this.stdout = stdout;
    this.frameBuffer = [];
    this.previousFrameBuffer = [];
    this.fps = 0;
    this.lastRender = 0;

    switch (Deno.build.os) {
      case "windows":
        this.addEventListener("render", async ({ timing }) => {
          if (timing !== Timing.Pre) return;

          const currentSize = await Deno.consoleSize(this.stdout.rid);
          if (currentSize.columns !== this.size.columns || currentSize.rows !== this.size.rows) {
            this.resizeCanvas(currentSize);
          }
        });
        break;
      default:
        Deno.addSignalListener("SIGWINCH", () => {
          this.resizeCanvas(Deno.consoleSize(this.stdout.rid));
        });
        break;
    }
  }

  resizeCanvas(size: ConsoleSize): void {
    const { columns, rows } = this.size;
    if (size.columns === columns && size.rows === rows) return;

    this.dispatchEvent(new CanvasResizeEvent(size));
    this.size = size;
    this.frameBuffer = [];
    this.previousFrameBuffer = [];
  }

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

  renderFrame(frame: string[][]): void {
    this.dispatchEvent(new RenderEvent(Timing.Pre));

    const { previousFrameBuffer, size } = this;

    if (previousFrameBuffer.length === 0) {
      Deno.writeSync(this.stdout.rid, textEncoder.encode(HIDE_CURSOR + CLEAR_SCREEN));
    }

    rows:
    for (let r = 0; r < frame.length; ++r) {
      if (r >= size.rows) break rows;

      const previousRow = previousFrameBuffer[r];
      const row = this.frameBuffer[r];

      if (row && JSON.stringify(previousRow) === JSON.stringify(row)) {
        continue rows;
      }

      columns:
      for (let c = 0; c < row.length; ++c) {
        if (c >= size.columns) continue rows;

        const column = row[c];
        if (previousRow?.[c] === column) continue columns;

        Deno.writeSync(this.stdout.rid, textEncoder.encode(moveCursor(r, c) + column));
      }
    }

    this.lastRender = performance.now();
    this.previousFrameBuffer = structuredClone(frame);

    this.dispatchEvent(new RenderEvent(Timing.Post));
  }

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
      await sleep(this.refreshRate + (this.fps / 1000) + deltaTime);
    }
  }
}
