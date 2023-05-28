// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { EmitterEvent, EventEmitter } from "../event_emitter.ts";

import { moveCursor } from "../utils/ansi_codes.ts";
import { SortedArray } from "../utils/sorted_array.ts";
import { rectangleIntersection } from "../utils/numbers.ts";

import type { ConsoleSize, Stdout } from "../types.ts";
import { DrawObject } from "./draw_object.ts";
import { BaseSignal } from "../signals.ts";
import { signalify } from "../utils/signals.ts";

const textEncoder = new TextEncoder();
const textBuffer = new Uint8Array(384 ** 2);

/** Interface defining object that {Canvas}'s constructor can interpret */
export interface CanvasOptions {
  /** Stdout to which canvas will render frameBuffer */
  stdout: Stdout;
  size: ConsoleSize | BaseSignal<ConsoleSize>;
}

/** Map that contains events that {Canvas} can dispatch */
export type CanvasEventMap = {
  render: EmitterEvent<[]>;
};

export class Canvas extends EventEmitter<CanvasEventMap> {
  stdout: Stdout;
  size: BaseSignal<ConsoleSize>;
  rerenderedObjects?: number;
  frameBuffer: string[][];
  resize: boolean;
  rerenderQueue: Set<number>[];
  drawnObjects: SortedArray<DrawObject>;

  constructor(options: CanvasOptions) {
    super();

    this.resize = true;
    this.frameBuffer = [];
    this.rerenderQueue = [];
    this.stdout = options.stdout;
    this.size = signalify(options.size, { deepObserve: true });
    this.drawnObjects = new SortedArray((a, b) => a.zIndex.peek() - b.zIndex.peek() || a.id - b.id);
  }

  updateIntersections(object: DrawObject): void {
    const { omitCells, objectsUnder } = object;

    const zIndex = object.zIndex.peek();
    const rectangle = object.rectangle.peek();

    for (const omitRows of omitCells) {
      omitRows?.clear();
    }

    objectsUnder.clear();

    for (const object2 of this.drawnObjects) {
      if (object === object2 || object2.outOfBounds) continue;

      const zIndex2 = object2.zIndex.peek();

      if (zIndex2 < zIndex || (zIndex2 === zIndex && object2.id < object.id)) {
        if (rectangleIntersection(rectangle, object2.rectangle.peek(), false)) {
          objectsUnder.add(object2);
        }
        continue;
      }

      const intersection = rectangleIntersection(rectangle, object2.rectangle.peek(), true);

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
  }

  render(): void {
    const { frameBuffer, drawnObjects, resize } = this;

    if (resize) this.resize = false;

    let i = 0;
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
      if (object.outOfBounds) {
        continue;
      }

      if (object.needsToUpdateIntersections) {
        ++i;
        this.updateIntersections(object);
        object.needsToUpdateIntersections = false;
      }

      if (object.rendered) {
        object.rerender();
      } else {
        object.render();
        object.rendered = true;
      }
    }

    this.rerenderedObjects = i;

    let drawSequence = "";
    let lastRow = -1;
    let lastColumn = -1;

    const { rid } = this.stdout;
    const { rerenderQueue } = this;

    for (let row = 0; row < rerenderQueue.length; ++row) {
      const columns = rerenderQueue[row];
      if (!columns?.size) continue;
      const rowBuffer = frameBuffer[row] ??= [];

      for (const column of columns) {
        if (row !== lastRow || column !== lastColumn + 1) {
          drawSequence += moveCursor(row, column);
        }

        const cell = rowBuffer[column];
        if (drawSequence.length + cell.length > 1024) {
          Deno.writeSync(
            rid,
            textBuffer.subarray(
              0,
              textEncoder.encodeInto(moveCursor(lastRow, lastColumn) + drawSequence, textBuffer).written,
            ),
          );
          drawSequence = moveCursor(row, column);
        }

        drawSequence += cell;

        lastRow = row;
        lastColumn = column;
      }

      columns.clear();
    }

    // Complete final loop draw sequence
    Deno.writeSync(
      rid,
      textBuffer.subarray(
        0,
        textEncoder.encodeInto(moveCursor(lastRow, lastColumn) + drawSequence, textBuffer).written,
      ),
    );

    this.emit("render");
  }
}
