import { Style } from "./theme.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";
import { CLEAR_SCREEN, moveCursor } from "./utils/ansi_codes.ts";

import { sleep } from "./utils/async.ts";
import { Deffered } from "./utils/deffered.ts";
import { textWidth } from "./utils/strings.ts";
import { SortedArray } from "./utils/sorted_array.ts";

import type { ConsoleSize, Rectangle, Stdout } from "./types.ts";

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
  omitCells: [number, number][];
  omitCellsPointer: number;
  rerenderCells: number[];
  rerenderCellsPointer: number;
  zIndex: number;
  style: Style;
  dynamic: boolean;
};

export type DrawBoxOptions<Prepared extends boolean = false> = Prepared extends true ? DrawObject<"box"> : {
  style: Style;
  rectangle: Rectangle;
  omitCells?: [number, number][];
  omitCellsPointer?: number;
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
    omitCells?: [number, number][];
    omitCellsPointer?: number;
    zIndex?: number;
    dynamic?: boolean;
  };

function compareToOmitCell(row: number, column: number, omitCell: [number, number]): boolean {
  return row === omitCell[0] && column === omitCell[1];
}

function compareOmitCellRange(
  row: number,
  column: number,
  omitCells: [number, number][],
  omitCellsPointer: number,
): boolean {
  for (let i = 0; i < omitCellsPointer; i++) {
    if (compareToOmitCell(row, column, omitCells[i])) {
      return true;
    }
  }
  return false;
}

function pushToPointedArray(array: [number, number][], index: number, row: number, column: number): void {
  if (array.length === index) {
    array.push([row, column]);
  } else {
    const entry = array[index];
    entry[0] = row;
    entry[1] = column;
  }
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

  drawText(text: DrawTextOptions<false>): DrawTextOptions<true> {
    const preparedText = text as DrawTextOptions<true>;

    preparedText.type = "text";
    text.omitCells ??= [];
    text.zIndex ??= 0;
    text.dynamic ??= false;

    this.drawnObjects.push(preparedText);
    this.updateIntersections(preparedText);

    return preparedText;
  }

  drawBox(box: DrawBoxOptions<false>): DrawBoxOptions<true> {
    const preparedBox = box as DrawBoxOptions<true>;

    preparedBox.type = "box";
    box.omitCells ??= [];
    box.zIndex ??= 0;
    box.dynamic ??= false;

    this.drawnObjects.push(preparedBox);
    this.updateIntersections(preparedBox);

    return preparedBox;
  }

  updateIntersections(obj: typeof this["drawnObjects"][number]): void {
    if (obj.type === "text") {
      let maxWidth = 0;
      let height = 0;
      let index = -1;
      do {
        height++;
        const lineEnd = obj.value.indexOf("\n", index + 1);
        const substring = lineEnd === -1 ? obj.value.substring(index + 1) : obj.value.substring(index + 1, lineEnd);
        maxWidth = Math.max(maxWidth, textWidth(substring));
        index = lineEnd;
      } while (index !== -1);
      obj.rectangle.width = maxWidth;
      obj.rectangle.height = height;
    }

    obj.rerenderCells ??= [];
    const { column: c1, row: r1, width: w1, height: h1 } = obj.rectangle;

    if (!this.onScreen(r1, c1)) return;

    const { omitCells, rerenderCells } = obj;
    obj.rerenderCellsPointer = rerenderCells.length;
    let omitCellsPointer = 0;

    for (const obj2 of this.drawnObjects) {
      const { column: c2, height: h2, width: w2, row: r2 } = obj2.rectangle;

      if (obj === obj2 || obj.zIndex >= obj2.zIndex || !this.onScreen(r2, c2)) {
        continue;
      }

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
          pushToPointedArray(omitCells, omitCellsPointer++, r, c);
          rerenderCells.push(r, c);
        }
      }
    }

    obj.omitCellsPointer = omitCellsPointer;
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

    let rendererQueueIndex = 0;

    if (this.frameBuffer.length < this.size.rows) {
      for (let r = 0; r < this.size.rows; ++r) {
        this.frameBuffer[r] ??= [];
      }
    }

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

      if (renderPartially) {
        // Rerender part of object
        const { rerenderCells } = object;

        for (let i = 0; i < rerenderCells.length; i += 2) {
          const row = rerenderCells[i];
          const column = rerenderCells[i + 1];

          if (
            !this.onScreen(row, column) || compareOmitCellRange(row, column, object.omitCells, object.omitCellsPointer)
          ) {
            continue;
          }

          this.frameBuffer[row][column] = object.style(" ");
          pushToPointedArray(this.#rerenderQueue, rendererQueueIndex++, row, column);
        }

        // Clear old rerender data
        rerenderCells.splice(0, object.rerenderCellsPointer);
      } else if (object.type === "text") {
        // Render text
        let index = -1;
        let r = 0;
        do {
          const lineEnd = object.value.indexOf("\n", index + 1);
          const line = lineEnd === -1 ? object.value.substring(index + 1) : object.value.substring(index + 1, lineEnd);
          index = lineEnd;

          const row = object.rectangle.row + r++;
          const rowBuffer = this.frameBuffer[row];

          for (let c = 0; c < line.length; ++c) {
            const column = object.rectangle.column + c;
            if (
              !this.onScreen(row, column) ||
              compareOmitCellRange(row, column, object.omitCells, object.omitCellsPointer)
            ) {
              continue;
            }

            rowBuffer[column] = object.style(line[c]);
            pushToPointedArray(this.#rerenderQueue, rendererQueueIndex++, row, column);
          }
        } while (index !== -1);
      } else {
        // Render box
        for (let row = object.rectangle.row; row < object.rectangle.row + object.rectangle.height; ++row) {
          const rowBuffer = this.frameBuffer[row];

          for (
            let column = object.rectangle.column;
            column < object.rectangle.column + object.rectangle.width;
            ++column
          ) {
            if (
              !this.onScreen(row, column) ||
              compareOmitCellRange(row, column, object.omitCells, object.omitCellsPointer)
            ) {
              continue;
            }

            rowBuffer[column] = object.style(" ");
            pushToPointedArray(this.#rerenderQueue, rendererQueueIndex++, row, column);
          }
        }
      }
    }

    if (rendererQueueIndex === 0) return;

    this.#rerenderQueue.length = rendererQueueIndex;

    this.#rerenderQueue.sort(
      ([r1, c1], [r2, c2]) => r1 - r2 || c1 - c2,
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
