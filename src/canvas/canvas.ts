import { BoxObject } from "./box.ts";
import { TextObject } from "./text.ts";

import { EmitterEvent, EventEmitter } from "../event_emitter.ts";

import { moveCursor } from "../utils/ansi_codes.ts";
import { SortedArray } from "../utils/sorted_array.ts";
import { rectangleIntersection } from "../utils/numbers.ts";

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

    // Rerender cells that object previously occupied
    // TODO: Check performance of this
    for (const object of objects) {
      object.rectangle.width = 0;
      object.updateMovement();
    }
  }

  updateIntersections(object: DrawableObject): void {
    const { columns, rows } = this.size;
    const { omitCells, rerenderCells, objectsUnder, zIndex, rectangle } = object;

    let objectsUnderPointer = 0;

    for (const object2 of this.drawnObjects) {
      if (object === object2) continue;

      const intersection = rectangleIntersection(rectangle, object2.rectangle, true);

      if (!intersection) continue;

      if (object2.zIndex <= zIndex) {
        objectsUnder[objectsUnderPointer++] = object2;
        continue;
      }

      for (let row = intersection.row; row < intersection.row + intersection.height; ++row) {
        if (row < 0) continue;
        else if (row > rows) break;

        omitCells[row] ??= new Set();
        rerenderCells[row] ??= new Set();

        for (let column = intersection.column; column < intersection.column + intersection.width; ++column) {
          if (column < 0) continue;
          else if (column > columns) break;

          omitCells[row].add(column);
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

    const { rerenderQueue, frameBuffer } = this;

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
