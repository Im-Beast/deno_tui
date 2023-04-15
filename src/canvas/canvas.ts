import { EmitterEvent, EventEmitter } from "../event_emitter.ts";

import { moveCursor } from "../utils/ansi_codes.ts";
import { SortedArray } from "../utils/sorted_array.ts";
import { rectangleIntersection } from "../utils/numbers.ts";

import type { ConsoleSize, Stdout } from "../types.ts";
import { DrawObject } from "./draw_object.ts";

const textEncoder = new TextEncoder();
const textBuffer = new Uint8Array(384 ** 2);

/** Interface defining object that {Canvas}'s constructor can interpret */
export interface CanvasOptions {
  /** Stdout to which canvas will render frameBuffer */
  stdout: Stdout;
  size: ConsoleSize;
}

/** Map that contains events that {Canvas} can dispatch */
export type CanvasEventMap = {
  render: EmitterEvent<[]>;
};

export class Canvas extends EventEmitter<CanvasEventMap> {
  stdout: Stdout;
  size: ConsoleSize;
  frameBuffer: string[][];
  resize: boolean;
  rerenderQueue: Set<number>[];
  drawnObjects: SortedArray<DrawObject>;

  constructor(options: CanvasOptions) {
    super();

    this.frameBuffer = [];
    this.rerenderQueue = [];
    this.stdout = options.stdout;
    this.size = options.size;
    this.resize = true;
    this.drawnObjects = new SortedArray((a, b) => a.zIndex - b.zIndex || a.id - b.id);
  }

  updateIntersections(object: DrawObject): void {
    if (object.outOfBounds) return;

    const { omitCells, objectsUnder, zIndex, rectangle } = object;

    let objectsUnderPointer = 0;

    for (const object2 of this.drawnObjects) {
      if (object === object2 || object2.outOfBounds) continue;

      if (object2.zIndex < zIndex || (object2.zIndex === zIndex && object2.id < object.id)) {
        objectsUnder[objectsUnderPointer++] = object2;
        continue;
      }

      const intersection = rectangleIntersection(rectangle, object2.rectangle, true);
      if (!intersection) continue;

      const rowRange = intersection.row + intersection.height;
      const columnRange = intersection.column + intersection.width;
      for (let row = intersection.row; row < rowRange; ++row) {
        const omitColumns = omitCells[row] ??= new Set();

        for (let column = intersection.column; column < columnRange; ++column) {
          omitColumns.add(column);
        }
      }
    }

    if (objectsUnder.length !== objectsUnderPointer) {
      objectsUnder.splice(objectsUnderPointer);
    }
  }

  render(): void {
    const { frameBuffer, drawnObjects, resize } = this;

    if (resize) {
      const { rows } = this.size;
      this.resize = false;

      if (frameBuffer.length < rows) {
        for (let r = frameBuffer.length; r < rows; ++r) {
          frameBuffer[r] ??= [];
        }
      }
    }

    for (const object of drawnObjects) {
      object.outOfBounds = false;

      if (resize) {
        object.rendered = false;
      }

      object.update();

      // DrawObjects might set outOfBounds in update()
      if (!object.outOfBounds) {
        object.updateOutOfBounds();
      }

      if (object.outOfBounds) {
        continue;
      }

      object.updateMovement();
      object.updatePreviousRectangle();
    }

    for (const object of drawnObjects) {
      if (object.outOfBounds || (object.rendered && object.rerenderCells.length === 0)) {
        continue;
      }

      this.updateIntersections(object);

      if (object.rendered) {
        object.rerender();
      } else {
        object.render();
        object.rendered = true;
      }
    }

    let drawSequence = "";
    let lastRow = -1;
    let lastColumn = -1;
    let setDir = false;

    const { rerenderQueue } = this;

    for (let row = 0; row < rerenderQueue.length; ++row) {
      const columns = rerenderQueue[row];
      if (columns.size === 0) continue;
      const rowBuffer = frameBuffer[row];

      for (const column of columns) {
        if (row !== lastRow || column !== lastColumn + 1) {
          setDir = false;
        }

        if (!setDir) {
          drawSequence += moveCursor(row, column);
          setDir = true;
        }

        drawSequence += rowBuffer[column];

        lastRow = row;
        lastColumn = column;
      }

      columns.clear();
    }

    // Complete final loop draw sequence
    Deno.writeSync(
      this.stdout.rid,
      textBuffer.subarray(
        0,
        textEncoder.encodeInto(
          moveCursor(lastRow, lastColumn) + drawSequence,
          textBuffer,
        ).written,
      ),
    );

    this.emit("render");
  }
}
