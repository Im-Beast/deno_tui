// Copyright 2023 Im-Beast. All rights reserved. MIT license.

// TODO; on style change, dont update intersections, just clear current ones
import { EmitterEvent, EventEmitter } from "../event_emitter.ts";

import { moveCursor } from "../utils/ansi_codes.ts";
import { SortedArray } from "../utils/sorted_array.ts";
import { rectangleIntersection } from "../utils/numbers.ts";

import type { ConsoleSize, Stdout } from "../types.ts";
import { Painter } from "./painter.ts";
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

interface Drawable {
  draw(row: number, column: number, data: string): void;
}

/**
 * Object, which stores data about currently rendered objects.
 *
 * It is responsible for outputting to stdout.
 */
export class Canvas extends EventEmitter<CanvasEventMap> implements Drawable {
  stdout: Stdout;
  size: Signal<ConsoleSize>;
  rerenderedObjects?: number;
  frameBuffer: string[][];
  rerenderQueue: Set<number>[];
  drawnObjects: SortedArray<Painter>;
  updateObjects: Painter[];
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

  draw(row: number, column: number, data: string): void {
    this.frameBuffer[row] ??= [];
    this.rerenderQueue[row] ??= new Set();

    this.frameBuffer[row][column] = data;
    this.rerenderQueue[row].add(column);
  }

  resize() {
    const { columns, rows } = this.size.peek();

    for (const drawObject of this.drawnObjects) {
      const { column, row } = drawObject.rectangle.peek();
      if (column >= columns || row >= rows) continue;

      drawObject.painted = false;
      drawObject.updated = false;
      this.updateObjects.push(drawObject);
    }
  }

  updateIntersections(object: Painter): void {
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

      object.paint();
    }

    this.rerenderedObjects = i;

    while (updateObjects.length) {
      updateObjects.pop();
    }

    let drawSequence = "";
    let lastRow = -1;
    let lastColumn = -1;

    const { rerenderQueue } = this;
    const size = this.size.peek();

    for (let row = 0; row < size.rows; ++row) {
      const columns = rerenderQueue[row];
      if (!columns?.size) continue;

      const rowBuffer = frameBuffer[row] ??= [];

      for (const column of columns) {
        if (row !== lastRow || column !== lastColumn + 1) {
          drawSequence += moveCursor(row, column);
        }

        const cell = rowBuffer[column];

        // This is required to render properly on windows
        if (drawSequence.length + cell.length > 1024) {
          stdout.writeSync(textEncoder.encode(moveCursor(lastRow, lastColumn) + drawSequence));
          drawSequence = moveCursor(row, column);
        }

        drawSequence += cell;

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
