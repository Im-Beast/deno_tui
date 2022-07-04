import {
  CLEAR_SCREEN,
  HIDE_CURSOR,
  moveCursor,
  SHOW_CURSOR,
} from "./ansi_codes.ts";
import { sleep, Timing, TypedCustomEvent, TypedEventTarget } from "./util.ts";
import type { ConsoleSize, Stdout } from "./types.ts";
import { crayon, replace, replaceAll } from "./deps.ts";

const textEncoder = new TextEncoder();

interface CanvasSize {
  columns: number;
  rows: number;
}

export interface CanvasOptions {
  size: CanvasSize;
  refreshRate: number;
  stdout: Stdout;
}

export class Canvas extends TypedEventTarget<{
  "render": {
    timing: Timing;
  };
  "frame": {
    timing: Timing;
  };
  "resize": {
    size: ConsoleSize;
  };
}> {
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
        this.addEventListener("render", async ({ detail }) => {
          if (detail.timing !== Timing.Pre) return;
          const currentSize = await Deno.consoleSize(this.stdout.rid);
          if (
            currentSize.columns !== this.size.columns ||
            currentSize.rows !== this.size.rows
          ) {
            await this.resizeCanvas(currentSize);
          }
        });
        break;
      default:
        Deno.addSignalListener("SIGWINCH", async () => {
          await this.resizeCanvas(await Deno.consoleSize(this.stdout.rid));
        });

        Deno.addSignalListener("SIGINT", () => {
          Deno.writeSync(this.stdout.rid, textEncoder.encode(SHOW_CURSOR));
          Deno.exit(0);
        });
        break;
    }
  }

  async resizeCanvas(size: ConsoleSize): Promise<void> {
    this.dispatchEvent(
      new TypedCustomEvent("resize", { detail: { size } }),
    );
    // Keep object reference
    Object.assign(this.size, size);
    this.prevFrameBuffer = [];
    await this.renderFrame(this.frameBuffer);
  }

  draw(column: number, row: number, value: string): void {
    column = ~~column;
    row = ~~row;

    if (value.length > 1) {
      if (value.includes("\n")) {
        for (const [i, line] of value.split("\n").entries()) {
          this.draw(column, row + i, line);
        }
        return;
      }

      const stripped = crayon.strip(value);
      const style = replaceAll(
        replace(value, stripped, ""),
        "\x1b[0m",
        "",
      );

      if (stripped.length > 1) {
        for (let i = 0; i < stripped.length; ++i) {
          if (!this?.frameBuffer?.[row]) {
            this.frameBuffer[row] ||= [];
          }

          this.frameBuffer[row][column + +i] = style
            ? (style + stripped[i] + "\x1b[0m")
            : stripped[i];
        }
        return;
      }
    }

    if (!this?.frameBuffer?.[row]) {
      this.frameBuffer[row] ||= [];
    }
    this.frameBuffer[row][column] = value;
  }

  async renderFrame(frame: string[][]): Promise<void> {
    this.dispatchEvent(
      new TypedCustomEvent("render", { detail: { timing: Timing.Pre } }),
    );
    const { prevFrameBuffer, size } = this;

    if (prevFrameBuffer.length === 0) {
      await Deno.write(
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

        Deno.write(
          this.stdout.rid,
          textEncoder.encode(moveCursor(+r, +c) + frame[r][c]),
        );
      }
    }

    this.dispatchEvent(
      new TypedCustomEvent("render", { detail: { timing: Timing.Post } }),
    );

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
        this.dispatchEvent(
          new TypedCustomEvent("frame", { detail: { timing: Timing.Pre } }),
        );

        await this.renderFrame(this.frameBuffer);

        this.dispatchEvent(
          new TypedCustomEvent("frame", { detail: { timing: Timing.Post } }),
        );
        yield Timing.Post;
      }

      deltaTime -= performance.now();
      await sleep(this.refreshRate + (this.fps / 1000) + deltaTime);
    }
  }
}
