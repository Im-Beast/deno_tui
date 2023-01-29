import { Style } from "./theme.ts";
import { EmitterEvent, EventEmitter } from "./event_emitter.ts";
import { moveCursor } from "./utils/ansi_codes.ts";

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

export type DrawObject<Type extends string = string> = {
  type: Type;

  objectsUnder: DrawObject[];

  rectangle: Rectangle;
  previousRectangle: Rectangle;

  rendered: boolean;

  omitCells: number[];
  omitCellsPointer: number;

  rerenderCells: number[];
  rerenderCellsPointer: number;

  style: Style;
  zIndex: number;
  dynamic: boolean;
};

export type DrawBoxOptions<Prepared extends boolean = false> = Prepared extends true
  ? DrawObject<"box"> & { filler: string }
  : {
    style: Style;
    rectangle: Rectangle;
    omitCells?: number[];
    omitCellsPointer?: number;
    zIndex?: number;
    dynamic?: boolean;
    filler?: string;
  };

export type DrawTextOptions<Prepared extends boolean = false> = Prepared extends true ? DrawObject<"text"> & {
    value: string;
    valueLines: string[];
    previousValue: string;
  }
  : {
    value: string;
    rectangle: { column: number; row: number };
    style: Style;
    omitCells?: number[];
    omitCellsPointer?: number;
    zIndex?: number;
    dynamic?: boolean;
  };

function compareOmitCellRange(
  row: number,
  column: number,
  omitCells: number[],
  omitCellsPointer: number,
): boolean {
  for (let i = 0; i < omitCellsPointer; i += 2) {
    if (row === omitCells[i] && column === omitCells[i + 1]) {
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

  drawnObjects: SortedArray<
    | DrawTextOptions<true>
    | DrawBoxOptions<true>
  >;
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
    preparedText.valueLines = text.value.split("\n");
    preparedText.previousValue = text.value;
    preparedText.rerenderCells ??= [];
    preparedText.objectsUnder ??= [];
    preparedText.omitCellsPointer ??= 0;
    preparedText.rerenderCellsPointer ??= 0;

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
    preparedBox.rerenderCells ??= [];
    preparedBox.objectsUnder ??= [];
    preparedBox.omitCellsPointer ??= 0;
    preparedBox.rerenderCellsPointer ??= 0;

    box.filler ??= " ";
    box.omitCells ??= [];
    box.zIndex ??= 0;
    box.dynamic ??= false;

    this.drawnObjects.push(preparedBox);
    this.updateIntersections(preparedBox);

    return preparedBox;
  }

  eraseObject(this: Canvas, object: typeof this["drawnObjects"][number]): void {
    this.drawnObjects.remove(object);
  }

  updateIntersections(this: Canvas, object: typeof this["drawnObjects"][number]): void {
    const { columns, rows } = this.size;

    const { omitCells, objectsUnder } = object;

    if (object.type === "text") {
      // FIXME: Because each text line can occupy different amount of characters widths should be stored for each line
      const { value, rectangle } = object;

      if (object.value !== object.previousValue) {
        const valueLines = object.valueLines = value.split("\n");

        let maxWidth = 0;
        for (let i = 0; i < valueLines.length; ++i) {
          maxWidth = Math.max(maxWidth, textWidth(valueLines[i]));
        }

        rectangle.width = maxWidth;
        rectangle.height = valueLines.length;
      }

      object.previousValue = object.value;
    }

    const { column: c1, row: r1, width: w1, height: h1 } = object.rectangle;

    let omitCellsPointer = 0;
    let objectsUnderPointer = 0;

    for (const object2 of this.drawnObjects) {
      if (object === object2) continue;
      const { column: c2, height: h2, width: w2, row: r2 } = object2.rectangle;

      if (
        !(c1 < c2 + w2 &&
          c1 + w1 > c2 &&
          r1 < r2 + h2 &&
          r1 + h1 > r2)
      ) continue;

      if (object.zIndex >= object2.zIndex) {
        objectsUnder[++objectsUnderPointer] = object2;
        continue;
      }

      const colWidth = Math.min(c1 + w1, c2 + w2);
      const rowHeight = Math.min(r1 + h1, r2 + h2);

      const width = Math.max(0, colWidth - Math.max(c1, c2));
      const height = Math.max(0, rowHeight - Math.max(r1, r2));

      const column = colWidth - width;
      const row = rowHeight - height;

      for (let r = row; r < row + height; ++r) {
        if (r < 0) continue;
        else if (r > rows) break;

        for (let c = column; c < column + width; ++c) {
          if (c < 0) continue;
          else if (c > columns) break;

          omitCells[omitCellsPointer++] = r;
          omitCells[omitCellsPointer++] = c;
        }
      }
    }

    if (objectsUnder.length !== objectsUnderPointer) {
      objectsUnder.splice(objectsUnderPointer + 1);
    }
    object.omitCellsPointer = omitCellsPointer;

    // Rerender cells that changed because objects position changed
    if (object.previousRectangle && objectsUnder) {
      const { column: pc1, row: pr1, width: pw1, height: ph1 } = object.previousRectangle;

      const colWidth = Math.min(c1 + w1, pc1 + pw1);
      const rowHeight = Math.min(r1 + h1, pr1 + ph1);

      const width = Math.max(0, colWidth - Math.max(c1, pc1));
      const height = Math.max(0, rowHeight - Math.max(r1, pr1));

      const column = colWidth - width;
      const row = rowHeight - height;

      for (let r = pr1; r < pr1 + ph1; ++r) {
        for (let c = pc1; c < pc1 + pw1; ++c) {
          if (c > column && r >= row && c < column + width - 1 && r < row + height - 1) continue;

          objectsUnder.forEach((o) => {
            o.rerenderCells[o.rerenderCellsPointer++] = r;
            o.rerenderCells[o.rerenderCellsPointer++] = c;
          });
        }
      }

      for (let r = r1; r < r1 + h1; ++r) {
        for (let c = c1; c < c1 + w1; ++c) {
          if (c > column && r > row && c < column + width - 1 && r < row + height - 1) continue;

          objectsUnder.forEach((o) => {
            o.rerenderCells[o.rerenderCellsPointer++] = r;
            o.rerenderCells[o.rerenderCellsPointer++] = c;
          });
        }
      }
    }

    object.previousRectangle = {
      column: c1,
      row: r1,
      width: w1,
      height: h1,
    };
  }

  rerender(): void {
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

    const { frameBuffer } = this;
    const { columns, rows } = this.size;

    if (frameBuffer.length < this.size.rows) {
      for (let r = 0; r < this.size.rows; ++r) {
        frameBuffer[r] ??= [];
      }
    }

    for (const object of this.drawnObjects) {
      this.updateIntersections(object);

      let renderPartially = false;
      if (object.rendered && !object.dynamic) {
        if (object.rerenderCells.length === 0) {
          continue;
        } else {
          renderPartially = true;
        }
      }

      object.rendered = true;

      switch (object.type) {
        case "text":
          {
            const { style, valueLines, rectangle, omitCells, omitCellsPointer } = object;

            // TODO: Partial rendering

            for (let i = 0; i < valueLines.length; ++i) {
              const line = valueLines[i];

              const row = rectangle.row + i;
              if (row < 0) continue;
              else if (row >= rows) break;

              const rowBuffer = frameBuffer[row];

              for (let c = 0; c < line.length; ++c) {
                const column = rectangle.column + c;

                if (column < 0) continue;
                else if (column >= columns) break;

                if (compareOmitCellRange(row, column, omitCells, omitCellsPointer)) {
                  continue;
                }

                rowBuffer[column] = style(line[c]);
                pushToPointedArray(this.#rerenderQueue, rendererQueueIndex++, row, column);
              }
            }
          }
          break;
        case "box":
          {
            const { rectangle } = object;

            if (renderPartially) {
              const { rerenderCells, rerenderCellsPointer, style, filler } = object;

              for (let i = 0; i < rerenderCellsPointer; i += 2) {
                const row = rerenderCells[i];
                if (row < 0 || row >= rows) continue;

                const column = rerenderCells[i + 1];

                if (
                  column < 0 || column >= columns || column < rectangle.column ||
                  column >= rectangle.column + rectangle.width || row < rectangle.row ||
                  row >= rectangle.row + rectangle.height ||
                  compareOmitCellRange(row, column, object.omitCells, object.omitCellsPointer)
                ) {
                  continue;
                }

                frameBuffer[row][column] = style(filler);
                pushToPointedArray(this.#rerenderQueue, rendererQueueIndex++, row, column);
              }

              object.rerenderCellsPointer = 0;
              break;
            }

            const { style, filler, omitCells, omitCellsPointer } = object;
            // Render box
            for (let row = rectangle.row; row < rectangle.row + rectangle.height; ++row) {
              if (row < 0) continue;
              else if (row >= rows) break;

              const rowBuffer = frameBuffer[row];

              for (
                let column = rectangle.column;
                column < rectangle.column + rectangle.width;
                ++column
              ) {
                if (column < 0) continue;
                else if (column >= columns) break;

                if (
                  compareOmitCellRange(row, column, omitCells, omitCellsPointer)
                ) {
                  continue;
                }

                rowBuffer[column] = style(filler);
                pushToPointedArray(this.#rerenderQueue, rendererQueueIndex++, row, column);
              }
            }
          }
          break;
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
}
