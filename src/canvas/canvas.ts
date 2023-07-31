// Copyright 2023 Im-Beast. All rights reserved. MIT license.

// TODO; on style change, dont update intersections, just clear current ones
import { EmitterEvent, EventEmitter } from "../event_emitter.ts";

import { moveCursor } from "../utils/ansi_codes.ts";
import { SortedArray } from "../utils/sorted_array.ts";
import { rectangleIntersection } from "../utils/numbers.ts";

import type { ConsoleSize, Stdout } from "../types.ts";
import { DrawObject } from "./draw_object.ts";
import { Signal, SignalOfObject } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";

const textEncoder = new TextEncoder();

/** Interface defining object that {Canvas}'s constructor can interpret */
export interface CanvasOptions {
  /** Stdout to which canvas will render frameBuffer */
  stdout: Stdout;
  size: ConsoleSize | SignalOfObject<ConsoleSize>;
}

/** Map that contains events that {Canvas} can dispatch */
export type CanvasEventMap = {
  render: EmitterEvent<[]>;
};

/**
 * Object, which stores data about currently rendered objects.
 *
 * It is responsible for outputting to stdout.
 */
export class Canvas extends EventEmitter<CanvasEventMap> {
  stdout: Stdout;
  size: Signal<ConsoleSize>;
  rerenderedObjects?: number;
  frameBuffer: (string | Uint8Array)[][];
  rerenderQueue: Set<number>[];
  drawnObjects: SortedArray<DrawObject>;
  updateObjects: DrawObject[];
  resizeNeeded: boolean;

  constructor(options: CanvasOptions) {
    super();

    this.frameBuffer = [];
    this.rerenderQueue = [];
    this.stdout = options.stdout;
    this.drawnObjects = new SortedArray((a, b) => a.zIndex.peek() - b.zIndex.peek() || a.id - b.id);
    this.updateObjects = [];
    this.resizeNeeded = false;

    this.size = signalify(options.size, { deepObserve: true });

    this.size.subscribe(() => {
      this.resizeNeeded = true;
    });
  }

  resize() {
    const { columns, rows } = this.size.peek();

    for (const drawObject of this.drawnObjects) {
      const { column, row } = drawObject.rectangle.peek();
      if (column >= columns || row >= rows) continue;

      drawObject.rendered = false;
      drawObject.updated = false;
      this.updateObjects.push(drawObject);
    }
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
    const { stdout, frameBuffer, updateObjects } = this;

    if (this.resizeNeeded) {
      this.resize();
      this.resizeNeeded = false;
    }

    if (!updateObjects.length) {
      return;
    }

    let i = 0;
    updateObjects.sort((a, b) => b.zIndex.peek() - a.zIndex.peek() || b.id - a.id);

    for (const object of updateObjects) {
      if (object.updated) continue;
      object.updated = true;
      ++i;
      object.update();

      object.updateMovement();
      object.updatePreviousRectangle();

      object.updateOutOfBounds();

      if (object.outOfBounds) {
        continue;
      }

      if (object.moved) {
        this.updateIntersections(object);
        object.moved = false;
      }

      if (object.rendered) {
        object.rerender();
      } else {
        object.render();
        object.rendered = true;
      }
    }

    this.rerenderedObjects = i;

    while (updateObjects.length) {
      updateObjects.pop();
    }

    let drawSequence = "";
    let lastRow = -1;
    let lastColumn = -1;

    const { rerenderQueue } = this;

    for (let row = 0; row < rerenderQueue.length; ++row) {
      const columns = rerenderQueue[row];
      if (!columns?.size) continue;

      const rowBuffer = frameBuffer[row] ??= [];

      for (const column of columns) {
        if (row !== lastRow || column !== lastColumn + 1) {
          drawSequence += moveCursor(row, column);
        }

        drawSequence += rowBuffer[column];

        lastRow = row;
        lastColumn = column;
      }

      columns.clear();
    }

    // Complete final loop draw sequence
    stdout.writeSync(textEncoder.encode(moveCursor(lastRow, lastColumn) + drawSequence));

    this.emit("render");
  }
}
