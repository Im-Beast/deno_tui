import { CLEAR_SCREEN, HIDE_CURSOR, moveCursor } from "./ansi_codes.ts";
import { fits, sleep, textEncoder, Timing, TypedEventTarget, UNICODE_CHAR_REGEXP } from "./util.ts";
import type { ConsoleSize, Rectangle, Stdout } from "./types.ts";
import { crayon, replace } from "./deps.ts";
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
    column = ~~column;
    row = ~~row;

    if (typeof value !== "string") return;

    if (value.length > 1) {
      const stripped = crayon.strip(value);
      if (stripped.length === 0) return;

      // deno-lint-ignore no-control-regex
      const styles = replace(value, stripped, "").split(/\x1b\[0m+/).filter((x) => x.length > 0);

      if (styles.length > 1) {
        for (const [i, style] of styles.entries()) {
          this.draw(column + (crayon.strip(styles?.[i - 1] ?? "").length), row, style);
        }
        return;
      }

      const style = styles[0] ?? "";

      if (value.includes("\n")) {
        for (const [i, line] of value.split("\n").entries()) {
          if (rectangle && !fits(row + i, rectangle.row, rectangle.row + rectangle.height)) {
            break;
          }
          this.draw(column, row + i, style + line);
        }
        return;
      }

      const realCharacters = stripped.match(UNICODE_CHAR_REGEXP)!;

      if (realCharacters.length > 1) {
        if (rectangle && !fits(row, rectangle.row, rectangle.row + rectangle.height)) {
          return;
        }

        for (let i = 0; i < realCharacters.length; ++i) {
          this.frameBuffer[row] ||= [];
          if (rectangle && !fits(column + i, rectangle.column, rectangle.column + rectangle.width)) {
            continue;
          }

          this.frameBuffer[row][column + i] = style + realCharacters[i] + "\x1b[0m";
        }
        return;
      }
    }

    if (
      rectangle && (
        !fits(column, rectangle.column, rectangle.column + rectangle.width) ||
        !fits(row, rectangle.row, rectangle.row + rectangle.height)
      )
    ) {
      return;
    }

    this.frameBuffer[row] ||= [];
    this.frameBuffer[row][column] = value;
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
