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

export type DrawObject<Type extends string> = {
  type: Type;
  rectangle: Rectangle;
  rendered: boolean;
  omitCells: string[];
  rerenderCells: [number, number][];
  previousRerenderSize: number;
  zIndex: number;
  style: Style;
  dynamic: boolean;
};

export type DrawBoxOptions<Prepared extends boolean = false> = Prepared extends true ? DrawObject<"box"> : {
  style: Style;
  rectangle: Rectangle;
  omitCells?: string[];
  zIndex?: number;
  dynamic?: boolean;
};

export type DrawTextOptions<Prepared extends boolean = false> = Prepared extends true ? DrawObject<"text"> & {
    value: string;
  }
  : {
    value: string;
    rectangle: {
      column: number;
      row: number;
    };
    style: Style;
    omitCells?: string[];
    zIndex?: number;
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

  drawnObjects: SortedArray<DrawTextOptions<true> | DrawBoxOptions<true>>;
  frameBuffer: string[][];

  #rerenderQueue: [number, number][] = [];

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

    preparedText.type = "text";
    text.omitCells ??= [];
    text.zIndex ??= 0;
    text.dynamic ??= false;

    this.drawnObjects.push(preparedText);
    this.updateIntersections(preparedText);
  }

  drawBox(box: DrawBoxOptions): void {
    const preparedBox = box as DrawBoxOptions<true>;

    preparedBox.type = "box";
    box.omitCells ??= [];
    box.zIndex ??= 0;
    box.dynamic ??= false;

    this.drawnObjects.push(preparedBox);
    this.updateIntersections(preparedBox);
  }

  updateIntersections(obj: typeof this["drawnObjects"][number]): void {
    // TODO: Check whether this can be further optimized
    obj.rerenderCells ??= [];
    const { column: c1, row: r1, width: w1, height: h1 } = obj.rectangle;

    if (!this.onScreen(r1, c1)) return;

    obj.previousRerenderSize = obj.rerenderCells.length;
    obj.omitCells.length = 0;

    if (obj.type === "text") {
      const lines = obj.value.split("\n");
      obj.rectangle.width = textWidth(lines.sort((a, b) => textWidth(a) - textWidth(b))[0]);
      obj.rectangle.height = lines.length;
    }

    for (const obj2 of this.drawnObjects) {
      const { column: c2, height: h2, width: w2, row: r2 } = obj2.rectangle;

      if (obj === obj2 || obj.zIndex >= obj2.zIndex || !this.onScreen(r2, c2)) continue;

      if (
        !(c1 < c2 + w2 &&
          c1 + w1 > c2 &&
          r1 < r2 + h2 &&
          r1 + h1 > r2)
      ) continue;

      const colWidth = Math.min(c1 + w1, c2 + w2);
      const rowHeight = Math.min(r1 + h1, r2 + h2);

      const width = Math.max(0, colWidth - Math.max(c1, c2));
      const height = Math.max(0, rowHeight - Math.max(r1, r2));

      const column = colWidth - width;
      const row = rowHeight - height;

      for (let r = row; r < row + height; ++r) {
        for (let c = column; c < column + width; ++c) {
          obj.omitCells.push(`${r},${c}`);
          obj.rerenderCells.push([r, c]);
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

    for (const object of this.drawnObjects) {
      let renderPartially = false;

      if (object.rendered && !object.dynamic) {
        if (object.rerenderCells.length === 0) {
          continue;
        } else {
          renderPartially = true;
        }
      }

      this.updateIntersections(object);

      object.rendered = true;

      // Rerender part of object
      if (renderPartially) {
        for (const [row, column] of object.rerenderCells) {
          const positionString = `${row},${column}`;
          if (!this.onScreen(row, column) || object.omitCells.includes(positionString)) {
            continue;
          }

          this.frameBuffer[row] ??= [];
          this.frameBuffer[row][column] = object.style(" ");
          this.#rerenderQueue.push([row, column]);
        }

        // Clear old rerender data
        object.rerenderCells.splice(0, object.previousRerenderSize);
        continue;
      }

      // Render text
      if (object.type === "text") {
        const lines = object.value.split("\n");
        for (const [r, line] of lines.entries()) {
          const row = object.rectangle.row + r;
          this.frameBuffer[row] ??= [];
          for (let c = 0; c < line.length; ++c) {
            const column = object.rectangle.column + c;

            const positionString = `${row},${column}`;
            if (!this.onScreen(row, column) || object.omitCells.includes(positionString)) {
              continue;
            }

            this.frameBuffer[row][column] = object.style(line[c]);
            this.#rerenderQueue.push([row, column]);
          }
        }

        continue;
      }

      // Render box
      for (let row = object.rectangle.row; row < object.rectangle.row + object.rectangle.height; ++row) {
        for (
          let column = object.rectangle.column;
          column < object.rectangle.column + object.rectangle.width;
          ++column
        ) {
          const positionString = `${row},${column}`;
          if (!this.onScreen(row, column) || object.omitCells.includes(positionString)) {
            continue;
          }

          this.frameBuffer[row] ??= [];
          this.frameBuffer[row][column] = object.style(" ");
          this.#rerenderQueue.push([row, column]);
        }
      }
    }

    if (this.#rerenderQueue.length === 0) return;

    this.#rerenderQueue.sort(
      ([r, c], [r2, c2]) => r - r2 === 0 ? c - c2 : r - r2,
    );

    let drawSequence = "";
    let sequenceColumn = -1;
    let sequenceRow = -1;
    const flushDrawSequence = () => {
      if (!drawSequence) return;
      Deno.writeSync(this.stdout.rid, textEncoder.encode(moveCursor(sequenceRow, sequenceColumn) + drawSequence));
      drawSequence = "";
    };

    let lastRow = -1;
    let lastColumn = -1;
    for (const [row, column] of this.#rerenderQueue) {
      if (row === lastRow && column === lastColumn) continue;

      if (row !== lastRow || column !== lastColumn + 1) {
        flushDrawSequence();
        sequenceRow = row;
        sequenceColumn = column;
      }

      drawSequence += this.frameBuffer[row][column];

      lastRow = row;
      lastColumn = column;
    }

    // Complete final loop draw sequence
    flushDrawSequence();

    this.#rerenderQueue.length = 0;
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
