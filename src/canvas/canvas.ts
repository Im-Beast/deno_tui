import { EmitterEvent, EventEmitter } from "../event_emitter.ts";

import { moveCursor } from "../utils/ansi_codes.ts";
import { SortedArray } from "../utils/sorted_array.ts";
import { rectangleIntersection } from "../utils/numbers.ts";

import type { ConsoleSize, Stdout } from "../types.ts";
import { DrawObject } from "./draw_object.ts";

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

  drawnObjects: SortedArray<DrawObject>;
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

    this.drawnObjects = new SortedArray((a, b) => a.zIndex - b.zIndex || a.id - b.id);
    this.frameBuffer = [];

    this.fillFrameBuffer();
  }

  updateIntersections(object: DrawObject): void {
    const { omitCells, rerenderCells, objectsUnder, zIndex, rectangle } = object;

    let objectsUnderPointer = 0;

    for (const object2 of this.drawnObjects) {
      if (object === object2) continue;

      const intersection = rectangleIntersection(rectangle, object2.rectangle, true);

      if (!intersection) continue;

      if (object2.zIndex < zIndex || (object2.zIndex === zIndex && object2.id < object.id)) {
        objectsUnder[objectsUnderPointer++] = object2;
        continue;
      }

      for (let row = intersection.row; row < intersection.row + intersection.height; ++row) {
        omitCells[row] ??= new Set();
        rerenderCells[row] ??= new Set();

        for (let column = intersection.column; column < intersection.column + intersection.width; ++column) {
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
      object.rendered = false;
    }
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
      if (object.outOfBounds) continue;
      object.updateMovement();
      object.updatePreviousRectangle();
    }

    for (const object of this.drawnObjects) {
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

    const { rid } = this.stdout;

    let drawSequence = "";
    let sequenceColumn = -1;
    let sequenceRow = -1;
    const flushDrawSequence = () => {
      if (!drawSequence) return;
      Deno.writeSync(rid, textEncoder.encode(moveCursor(sequenceRow, sequenceColumn) + drawSequence));
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
