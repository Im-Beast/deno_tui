// TODO: organize imports
import { Style } from "./theme.ts";
import { ConsoleSize, Rectangle, Stdout } from "./types.ts";
import { textWidth } from "./utils/strings.ts";
import { sleep } from "./utils/async.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";
import { SortedArray } from "./utils/sorted_array.ts";
import { Deffered } from "./utils/deffered.ts";
import { CLEAR_SCREEN } from "./utils/ansi_codes.ts";

const textEncoder = new TextEncoder();

/** Interface defining object that {Canvas}'s constructor can interpret */
export interface CanvasOptions {
  /** How often canvas tries to find differences in its frameBuffer and render */
  refreshRate: number;
  /** Stdout to which canvas will render frameBuffer */
  stdout: Stdout;
}

/** Map that contains events that {Canvas} can dispatch */
export type CanvasEventMap = {
  render: EmitterEvent<[]>;
};

export type DrawBoxOptions<Prepared extends boolean = false> =
  & Rectangle
  & (Prepared extends true ? {
      zIndex: number;
      rendered: boolean;
      rerender: [number, number][];
      lastRerenderSize: number;
      readonly omit: string[];
    }
    : {
      omit?: string[];
      zIndex?: number;
      rendered?: boolean;
    })
  & {
    style: Style;
    dynamic?: boolean;
  };

export type DrawTextOptions<Prepared extends boolean = false> =
  & (Prepared extends true ? {
      width: number;
      height: number;
      zIndex: number;
      rendered: boolean;
      rerender: [number, number][];
      lastRerenderSize: number;
      readonly omit: string[];
    }
    : {
      omit?: string[];
      rendered?: boolean;
      zIndex?: number;
    })
  & {
    column: number;
    row: number;
    value: string;
    style: Style;
    dynamic?: boolean;
  };

export function moveCursor(row: number, column: number): string {
  return `\x1b[${row + 1};${column + 1}H`;
}

export class Canvas extends EventEmitter<CanvasEventMap> {
  fps: number;
  lastRender: number;

  size: ConsoleSize;
  refreshRate: number;
  stdout: Stdout;

  drawnObjects: SortedArray<(DrawBoxOptions<true> | DrawTextOptions<true>)>;
  frameBuffer: string[][];

  constructor(options: CanvasOptions) {
    super();

    this.refreshRate = options.refreshRate ?? 1000 / 60;
    this.fps = 0;
    this.lastRender = 0;

    this.stdout = options.stdout;
    this.size = Deno.consoleSize();

    this.drawnObjects = new SortedArray();
    this.frameBuffer = [];

    switch (Deno.build.os) {
      case "windows":
        this.on("render", () => {
          const size = Deno.consoleSize();
          if (this.size.columns !== size.columns || this.size.rows !== size.rows) {
            this.size = size;
            this.rerender();
          }
        });
        break;
      default:
        Deno.addSignalListener("SIGWINCH", () => {
          const size = Deno.consoleSize();
          if (this.size.columns !== size.columns || this.size.rows !== size.rows) {
            this.size = size;
            this.rerender();
          }
        });
        break;
    }
  }

  drawText(text: DrawTextOptions): void {
    const preparedText = text as DrawTextOptions<true>;

    text.omit ??= [];
    text.zIndex ??= 0;
    text.dynamic ??= false;

    this.drawnObjects.push(preparedText);
    this.updateIntersections(preparedText);
  }

  drawBox(box: DrawBoxOptions): void {
    const preparedBox = box as DrawBoxOptions<true>;

    box.omit ??= [];
    box.zIndex ??= 0;
    box.dynamic ??= false;

    this.drawnObjects.push(preparedBox);
    this.updateIntersections(preparedBox);
  }

  updateIntersections(obj: typeof this["drawnObjects"][number]): void {
    // TODO: Check whether this can be further optimized
    obj.rerender ??= [];
    if (!this.onScreen(obj.row, obj.column)) return;

    obj.lastRerenderSize = obj.rerender.length;
    obj.omit.length = 0;

    if ("value" in obj) {
      const lines = obj.value.split("\n");
      obj.width = textWidth(lines.sort((a, b) => textWidth(a) - textWidth(b))[0]);
      obj.height = lines.length;
    }

    for (const obj2 of this.drawnObjects) {
      if (obj === obj2 || obj.zIndex >= obj2.zIndex || !this.onScreen(obj2.row, obj2.column)) continue;

      if (
        !(obj.column < obj2.column + obj2.width &&
          obj.column + obj.width > obj2.column &&
          obj.row < obj2.row + obj2.height &&
          obj.row + obj.height > obj2.row)
      ) continue;

      const colWidth = Math.min(obj.column + obj.width, obj2.column + obj2.width);
      const rowHeight = Math.min(obj.row + obj.height, obj2.row + obj2.height);

      const width = Math.max(0, colWidth - Math.max(obj.column, obj2.column));
      const height = Math.max(0, rowHeight - Math.max(obj.row, obj2.row));

      const column = colWidth - width;
      const row = rowHeight - height;

      for (let r = row; r < row + height; ++r) {
        for (let c = column; c < column + width; ++c) {
          obj.omit.push(`${r},${c}`);
          obj.rerender.push([r, c]);
        }
      }
    }
  }

  onScreen(row: number, column: number): boolean {
    return row >= 0 && row < this.size.rows && column >= 0 && column < this.size.columns;
  }

  rerender(): void {
    Deno.writeSync(this.stdout.rid, textEncoder.encode(CLEAR_SCREEN));
    for (const object of this.drawnObjects) {
      this.updateIntersections(object);
      object.rendered = false;
    }
    this.render();
  }

  render(): void {
    this.fps = 1000 / (performance.now() - this.lastRender);
    this.emit("render");

    const rerender: [number, number][] = [];

    for (const object of this.drawnObjects) {
      if (object.rendered && object.rerender.length === 0 && !object.dynamic) {
        continue;
      }

      this.updateIntersections(object);

      const justRerender = object.rendered && !object.dynamic && object.rerender.length > 0;

      object.rendered = true;

      // Rerender part of object
      if (justRerender) {
        for (const [r, c] of object.rerender) {
          const positionString = `${r},${c}`;
          if (!this.onScreen(r, c) || object.omit.includes(positionString)) {
            continue;
          }

          this.frameBuffer[r] ??= [];
          this.frameBuffer[r][c] = object.style(" ");
          rerender.push([r, c]);
        }

        // Clear old rerender data
        object.rerender.splice(0, object.lastRerenderSize);
        continue;
      }

      // Render text
      if ("value" in object) {
        const lines = object.value.split("\n");
        for (const [row, line] of lines.entries()) {
          const r = object.row + row;
          this.frameBuffer[r] ??= [];
          for (let column = 0; column < line.length; ++column) {
            const c = object.column + column;

            const positionString = `${r},${c}`;
            if (!this.onScreen(r, c) || object.omit.includes(positionString)) {
              continue;
            }

            this.frameBuffer[r][c] = object.style(line[column]);
            rerender.push([r, c]);
          }
        }

        continue;
      }

      // Render box
      for (let r = object.row; r < object.row + object.height; ++r) {
        for (let c = object.column; c < object.column + object.width; ++c) {
          const positionString = `${r},${c}`;
          if (!this.onScreen(r, c) || object.omit.includes(positionString)) {
            continue;
          }

          this.frameBuffer[r] ??= [];
          this.frameBuffer[r][c] = object.style(" ");
          rerender.push([r, c]);
        }
      }
    }

    if (rerender.length === 0) return;

    rerender.sort(
      ([r, c], [r2, c2]) => r - r2 === 0 ? c - c2 : r - r2,
    );

    const drawSequences: [number, number, string][] = [];

    let lastRow = -1;
    let lastCol = -1;
    let index = -1;
    for (const [r, c] of rerender) {
      if (r === lastRow && c === lastCol) continue;

      if (r !== lastRow || c !== lastCol + 1) {
        ++index;
        drawSequences[index] = [r, c, ""];
      }

      drawSequences[index][2] += this.frameBuffer[r][c];

      lastRow = r;
      lastCol = c;
    }

    // Multiple split sequences are faster to write than one long sequence
    // That's why I didn't combine them into big one and then encoded them.
    // It's probably because of the overhead of the textEncoder and writing taking a bit.
    for (const [r, c, string] of drawSequences) {
      Deno.writeSync(
        Deno.stdout.rid,
        textEncoder.encode(moveCursor(r, c) + string),
      );
    }

    this.lastRender = performance.now();
  }

  /**
   * Runs a loop in which it checks whether frameBuffer has changed (anything new has been drawn).
   * If so, run `renderFrame()` with current frame buffer and in the way yield and emit proper events.
   * On each iteration it sleeps for adjusted `refreshRate` time.
   */
  start(): () => void {
    const deffered = new Deffered<void>();

    (async () => {
      while (deffered.state === "pending") {
        this.render();
        await sleep(this.refreshRate);
      }
    })();

    return deffered.resolve;
  }
}
