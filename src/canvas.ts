import { CLEAR_SCREEN, HIDE_CURSOR, moveCursor } from "./ansi_codes.ts";
import {
  fits,
  fitsInRectangle,
  isFullWidth,
  sleep,
  textEncoder,
  textWidth,
  Timing,
  TypedEventTarget,
  UNICODE_CHAR_REGEXP,
} from "./util.ts";
import type { ConsoleSize, Rectangle, Stdout } from "./types.ts";
import { crayon } from "./deps.ts";
import { CanvasResizeEvent, FrameEvent, RenderEvent } from "./events.ts";

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
  prevFrameBuffer: this["frameBuffer"];
  lastRender: number;
  fps: number;

  constructor({ size, refreshRate, stdout }: CanvasOptions) {
    super();

    this.size = size;
    this.refreshRate = refreshRate;
    this.stdout = stdout;
    this.frameBuffer = [];
    this.prevFrameBuffer = [];
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
    if (size.columns === this.size.columns && size.rows === this.size.rows) return;

    this.dispatchEvent(new CanvasResizeEvent(size));
    this.size = size;
    this.frameBuffer = [];
    this.prevFrameBuffer = [];
  }

  draw(column: number, row: number, value: string, rectangle?: Rectangle): void {
    if (typeof value !== "string" || value.length === 0 || typeof column !== "number" || typeof row !== "number") {
      return;
    }

    column = ~~column;
    row = ~~row;

    const stripped = crayon.strip(value);

    if (stripped.length === 0) return;
    if (stripped.length === 1) {
      if (!fitsInRectangle(column, row, rectangle)) return;

      this.frameBuffer[row] ||= [];
      this.frameBuffer[row][column] = value;
      if (this.frameBuffer[row][column + 1] === undefined) {
        const style = value.replace(crayon.strip(value), "").replaceAll("\x1b[0m", "");
        this.frameBuffer[row][column + 1] = `${style} \x1b[0m`;
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

    this.frameBuffer[row] ||= [];
    let offset = 0;
    for (const character of realCharacters) {
      const offsetColumn = column + offset;
      if (rectangle && !fits(offsetColumn, rectangle.column, rectangle.column + rectangle.width)) return;

      this.frameBuffer[row][offsetColumn] = `${style}${character}\x1b[0m`;
      if (isFullWidth(character)) {
        delete this.frameBuffer[row][offsetColumn + 1];
        ++offset;
      } else if (offsetColumn + 1 < this.frameBuffer[row].length) {
        this.frameBuffer[row][offsetColumn + 1] ??= `${style} \x1b[0m`;
      }

      ++offset;
    }
  }

  renderFrame(frame: string[][]): void {
    this.dispatchEvent(new RenderEvent(Timing.Pre));
    const { prevFrameBuffer, size } = this;

    if (prevFrameBuffer.length === 0) {
      Deno.writeSync(
        this.stdout.rid,
        textEncoder.encode(HIDE_CURSOR + CLEAR_SCREEN),
      );
    }

    rows:
    for (const r in frame) {
      if (+r > size.rows) break rows;
      if (prevFrameBuffer?.[r]?.join("") === frame?.[r]?.join("")) {
        continue rows;
      }

      columns:
      for (const c in frame[r]) {
        if (+c > size.columns) break columns;
        if (prevFrameBuffer?.[r]?.[c] === frame?.[r]?.[c]) continue columns;

        Deno.writeSync(
          this.stdout.rid,
          textEncoder.encode(moveCursor(+r, +c) + frame[r][c]),
        );
      }
    }

    this.dispatchEvent(new RenderEvent(Timing.Post));

    this.lastRender = performance.now();
    this.prevFrameBuffer = structuredClone(frame);
  }

  async *render() {
    while (true) {
      let deltaTime = performance.now();
      this.fps = 1000 / (performance.now() - this.lastRender);

      if (
        this.lastRender === 0 ||
        `${this.frameBuffer}` !== `${this.prevFrameBuffer}`
      ) {
        yield Timing.Pre;
        this.dispatchEvent(new FrameEvent(Timing.Pre));

        this.renderFrame(this.frameBuffer);

        this.dispatchEvent(new FrameEvent(Timing.Post));
        yield Timing.Post;
      }

      deltaTime -= performance.now();
      await sleep(this.refreshRate + (this.fps / 1000) + deltaTime);
    }
  }
}
