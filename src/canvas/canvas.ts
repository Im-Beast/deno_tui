import { BoxObject } from "./box.ts";
import { TextObject } from "./text.ts";

import { Style } from "../theme.ts";
import { EmitterEvent, EventEmitter } from "../event_emitter.ts";

import { moveCursor } from "../utils/ansi_codes.ts";
import { SortedArray } from "../utils/sorted_array.ts";

import type { ConsoleSize, Rectangle, Stdout } from "../types.ts";
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";

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
  omitCells?: number[];
  omitCellsPointer?: number;

  style: Style;
  zIndex?: number;
}

export class DrawObject<Type extends string = string> {
  type: Type;

  style: Style;
  previousStyle?: Style;

  rectangle!: Rectangle;
  previousRectangle?: Rectangle;

  objectsUnder: DrawObject[];
  objectsUnderPointer: number;

  omitCells: Set<number>[];
  rerenderCells: Set<number>[];

  zIndex: number;
  rendered: boolean;

  constructor(type: Type, options: DrawObjectOptions) {
    this.type = type;
    this.rendered = false;
    this.style = options.style;

    this.rerenderCells = [];
    this.omitCells = [];

    this.objectsUnderPointer = 0;
    this.objectsUnder = [];

    this.zIndex = options.zIndex ?? 0;
  }

  queueRerender(row: number, column: number): void {
    (this.rerenderCells[row] ??= new Set()).add(column);
  }

  updatePreviousRectangle(): void {
    const { rectangle, previousRectangle } = this;

    if (!previousRectangle) {
      this.previousRectangle = {
        column: rectangle.column,
        row: rectangle.row,
        width: rectangle.width,
        height: rectangle.height,
      };
    } else {
      previousRectangle.column = rectangle.column;
      previousRectangle.row = rectangle.row;
      previousRectangle.height = rectangle.height;
      previousRectangle.width = rectangle.width;
    }
  }

  updateMovement(): void {
    const { rectangle, previousRectangle, objectsUnder } = this;

    // Rerender cells that changed because objects position changed
    if (previousRectangle && !rectangleEquals(rectangle, previousRectangle)) {
      const intersection = rectangleIntersection(rectangle, previousRectangle, true);

      for (let r = previousRectangle.row; r < previousRectangle.row + previousRectangle.height; ++r) {
        for (let c = previousRectangle.column; c < previousRectangle.column + previousRectangle.width; ++c) {
          if (intersection && fitsInRectangle(c, r, intersection)) {
            continue;
          }

          for (const objectUnder of objectsUnder) {
            // FIXME: I shouldn't need to delete omitCells data here
            // This is a workaround to make first move rerender correctly
            objectUnder.omitCells[r]?.delete(c);
            objectUnder.queueRerender(r, c);
          }
        }
      }

      for (let r = rectangle.row; r < rectangle.row + rectangle.height; ++r) {
        for (let c = rectangle.column; c < rectangle.column + rectangle.width; ++c) {
          if (intersection && fitsInRectangle(c, r, intersection)) {
            continue;
          }

          for (const objectUnder of objectsUnder) {
            objectUnder.queueRerender(r, c);
          }

          this.queueRerender(r, c);
        }
      }
    }
  }

  update(): void {
    const { style } = this;

    if (style !== this.previousStyle) {
      this.rendered = false;
    }

    this.previousStyle = style;
  }

  render(_canvas: Canvas): void {}
  rerender(_canvas: Canvas): void {}
}

export class Canvas extends EventEmitter<CanvasEventMap> {
  fps: number;
  lastRender: number;

  size: ConsoleSize;
  refreshRate: number;
  stdout: Stdout;

  drawnObjects: SortedArray<DrawableObject>;
  frameBuffer: string[][];

  rerenderQueue: Set<number>[];

  constructor(options: CanvasOptions) {
    super();

    this.refreshRate = options.refreshRate ?? 1000 / 60;
    this.fps = 0;
    this.lastRender = 0;

    this.rerenderQueue = [];

    this.stdout = options.stdout;
    this.size = Deno.consoleSize();

    this.drawnObjects = new SortedArray((a, b) => a.zIndex - b.zIndex);
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

    this.fillFrameBuffer();
  }

  drawObject(object: DrawableObject): void {
    this.drawnObjects.push(object);
    this.updateIntersections(object);
  }

  eraseObjects(...objects: DrawableObject[]): void {
    this.drawnObjects.remove(...objects);
  }

  updateIntersections(object: DrawableObject): void {
    const { columns, rows } = this.size;
    const { omitCells, objectsUnder, zIndex, rectangle } = object;

    let objectsUnderPointer = 0;

    for (const object2 of this.drawnObjects) {
      if (object === object2) continue;

      const intersection = rectangleIntersection(rectangle, object2.rectangle, true);

      if (!intersection) continue;

      if (object2.zIndex < zIndex) {
        objectsUnder[objectsUnderPointer++] = object2;
        continue;
      }

      for (let r = intersection.row; r < intersection.row + intersection.height; ++r) {
        if (r < 0) continue;
        else if (r > rows) break;

        omitCells[r] ??= new Set();

        for (let c = intersection.column; c < intersection.column + intersection.width; ++c) {
          if (c < 0) continue;
          else if (c > columns) break;

          omitCells[r].add(c);
        }
      }
    }

    if (objectsUnder.length !== objectsUnderPointer) {
      objectsUnder.splice(objectsUnderPointer);
    }
  }

  rerender(): void {
    this.fillFrameBuffer();

    for (const object of this.drawnObjects) {
      this.updateIntersections(object);
      object.rendered = false;
    }

    this.render();
  }

  fillFrameBuffer(): void {
    const { frameBuffer } = this;
    const { rows } = this.size;

    if (frameBuffer.length < rows) {
      for (let r = 0; r < rows; ++r) {
        frameBuffer[r] ??= [];
      }
    }
  }

  render(): void {
    this.fps = 1000 / (performance.now() - this.lastRender);
    this.emit("render");

    const { rerenderQueue, frameBuffer } = this;

    for (const object of this.drawnObjects) {
      object.update();
      object.updateMovement();
      this.updateIntersections(object);
      object.updatePreviousRectangle();
    }

    for (const object of this.drawnObjects) {
      if (object.rendered && object.rerenderCells.length === 0) {
        continue;
      }

      if (object.rendered) {
        object.rerender(this);
      } else {
        object.render(this);
        object.rendered = true;
      }
    }

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
    for (const key in rerenderQueue) {
      const columns = rerenderQueue[key];
      if (columns.size === 0) continue;
      const row = +key;

      const rowBuffer = frameBuffer[key];

      for (const column of columns) {
        if (row !== lastRow || column !== lastColumn + 1) {
          flushDrawSequence();
          sequenceRow = row;
          sequenceColumn = column;
        }

        drawSequence += rowBuffer[column];

        lastRow = row;
        lastColumn = column;
      }

      columns.clear();
    }

    // Complete final loop draw sequence
    flushDrawSequence();

    this.lastRender = performance.now();
  }
}
