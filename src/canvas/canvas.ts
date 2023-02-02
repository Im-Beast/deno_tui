import { BoxObject } from "./box.ts";
import { TextObject } from "./text.ts";

import { Style } from "../theme.ts";
import { EmitterEvent, EventEmitter } from "../event_emitter.ts";

import { moveCursor } from "../utils/ansi_codes.ts";
import { SortedArray } from "../utils/sorted_array.ts";

import type { ConsoleSize, Rectangle, Stdout } from "../types.ts";

export type DrawableObject = BoxObject | TextObject;

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

export interface DrawObjectOptions<Type extends string = string> {
  rectangle: Rectangle;

  omitCells?: number[];
  omitCellsPointer?: number;

  style: Style;
  zIndex?: number;
  dynamic?: boolean;
}

export class DrawObject<Type extends string = string> {
  type: Type;

  objectsUnder: DrawObject[];

  rectangle: Rectangle;
  previousRectangle?: Rectangle;

  omitCells: number[];
  omitCellsPointer: number;
  rerenderCells: number[];
  rerenderCellsPointer: number;

  style: Style;
  zIndex: number;
  dynamic: boolean;
  rendered: boolean;

  constructor(type: Type, options: DrawObjectOptions) {
    this.type = type;
    this.rendered = false;
    this.style = options.style;
    this.rectangle = options.rectangle;

    this.rerenderCells = [];
    this.rerenderCellsPointer = 0;

    this.omitCells = [];
    this.omitCellsPointer = 0;

    this.objectsUnder = [];

    this.zIndex = options.zIndex ?? 0;
    this.dynamic = options.dynamic ?? false;
  }

  render(_canvas: Canvas): void {}
  rerender(_canvas: Canvas): void {}
}

export function compareOmitCellRange(
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

export function pushToPointedArray(array: [number, number][], index: number, row: number, column: number): void {
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

  drawnObjects: SortedArray<DrawableObject>;
  frameBuffer: string[][];

  rerenderQueue: [number, number][];
  rerenderQueuePointer: number;

  constructor(options: CanvasOptions) {
    super();

    this.refreshRate = options.refreshRate ?? 1000 / 60;
    this.fps = 0;
    this.lastRender = 0;

    this.rerenderQueue = [];
    this.rerenderQueuePointer = 0;

    this.stdout = options.stdout;
    this.size = Deno.consoleSize();

    this.drawnObjects = new SortedArray();
    this.frameBuffer = [];

    const updateCanvasSize = () => {
      const size = Deno.consoleSize();
      if (this.size.columns !== size.columns || this.size.rows !== size.rows) {
        this.size = size;
        this.rerender();
      }
    };

    if (Deno.build.os === "windows") {
      this.on("render", updateCanvasSize);
    } else {
      Deno.addSignalListener("SIGWINCH", updateCanvasSize);
    }

    this.updateFrameBufferBoundaries();
  }

  drawObject(object: DrawableObject): void {
    this.drawnObjects.push(object);
    this.updateIntersections(object);
  }

  eraseObjects(...objects: DrawableObject[]): void {
    this.drawnObjects.remove(...objects);
  }

  // TODO: Move intersection logic to individual objects
  updateIntersections(this: Canvas, object: DrawableObject): void {
    const { columns, rows } = this.size;

    const { omitCells, objectsUnder } = object;

    if (object.type === "text") {
      // FIXME: Because each text line can occupy different amount of characters widths should be stored for each line
      object.updateRectangle();
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

    this.updateFrameBufferBoundaries();
    this.render();
  }

  // TODO: rename
  updateFrameBufferBoundaries(): void {
    const { frameBuffer } = this;

    if (frameBuffer.length < this.size.rows) {
      for (let r = 0; r < this.size.rows; ++r) {
        frameBuffer[r] ??= [];
      }
    }
  }

  render(): void {
    this.fps = 1000 / (performance.now() - this.lastRender);
    this.emit("render");

    const { rerenderQueue } = this;
    this.rerenderQueuePointer = 0;

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

      if (renderPartially) {
        object.rerender(this);
      } else {
        object.render(this);
      }
    }

    if (this.rerenderQueuePointer === 0) return;

    rerenderQueue.length = this.rerenderQueuePointer;

    rerenderQueue.sort(
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
    for (const [row, column] of rerenderQueue) {
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
