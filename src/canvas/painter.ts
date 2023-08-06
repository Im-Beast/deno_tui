// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";

// FIXME: rename to painters, drawobjects sounds cringe

import type { Style } from "../theme.ts";
import type { Canvas } from "./canvas.ts";
import type { Offset, Rectangle } from "../types.ts";
import { View } from "../view.ts";
import { Signal, SignalOfObject } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";
import { Subscription } from "../signals/types.ts";
import { Effect } from "../signals/effect.ts";

export interface PainterOptions {
  canvas: Canvas;

  omitCells?: number[];
  omitCellsPointer?: number;

  view?: View | Signal<View | undefined>;
  style: Style | SignalOfObject<Style>;
  zIndex: number | Signal<number>;
}

let id = 0;

/**
 * Base DrawObject which works as a skeleton for creating
 * draw objects which actually do something
 */
export class Painter<Type extends string = string> {
  id: number;
  type: Type;

  canvas: Canvas;

  style: Signal<Style>;
  zIndex: Signal<number>;

  view: Signal<View | undefined>;
  viewOffset: Offset;

  rectangle!: Signal<Rectangle>;
  previousRectangle?: Rectangle;

  objectsUnder: Set<Painter>;

  omitCells: Set<number>[];
  rerenderCells: Set<number>[];

  painted: boolean;
  outOfBounds: boolean;
  updated: boolean;
  moved: boolean;

  #styleSubscription: Subscription<Style>;

  constructor(type: Type, options: PainterOptions) {
    this.id = id++;
    this.type = type;

    this.canvas = options.canvas;

    this.viewOffset = { columns: 0, rows: 0 };

    this.omitCells = [];
    this.rerenderCells = [];

    this.objectsUnder = new Set();

    this.painted = false;
    this.outOfBounds = false;
    this.canvas.updateObjects.push(this);
    this.updated = true;
    this.moved = true;

    this.view = signalify(options.view);
    this.zIndex = signalify(options.zIndex);
    this.style = signalify(options.style);

    const { updateObjects } = this.canvas;

    this.#styleSubscription = () => {
      this.painted = false;
      this.updated = false;
      updateObjects.push(this);

      for (const objectUnder of this.objectsUnder) {
        objectUnder.updated = false;
        updateObjects.push(objectUnder);
      }
    };

    if (this.view.value) {
      queueMicrotask(() => {
        new Effect(() => {
          const view = this.view.value;
          // FIXME: they might not get watched if view wasnt set by default
          if (view) {
            const viewRectangle = view?.rectangle.value;
            const offset = view?.offset.value;
            const _maxOffset = view?.maxOffset.value;

            const rectangle = this.rectangle?.peek();
            if (!rectangle) return;
            const { viewOffset } = this;

            rectangle.column += viewRectangle.column - offset.columns - viewOffset.columns;
            rectangle.row += viewRectangle.row - offset.rows - viewOffset.rows;

            viewOffset.columns = viewRectangle.column - offset.columns;
            viewOffset.rows = viewRectangle.row - offset.rows;
          }

          this.updated = false;
          updateObjects.push(this);

          for (const objectUnder of this.objectsUnder) {
            objectUnder.updated = false;
            updateObjects.push(objectUnder);
          }
        });
      });
    }
  }

  draw(): void {
    this.style.subscribe(this.#styleSubscription);

    this.painted = false;

    const { objectsUnder } = this;
    const { updateObjects } = this.canvas;

    this.moved = true;
    this.updated = false;
    updateObjects.push(this);

    for (const objectUnder of objectsUnder) {
      objectUnder.moved = true;
      objectUnder.updated = false;
      updateObjects.push(objectUnder);
    }

    this.canvas.drawnObjects.push(this);
  }

  erase(): void {
    this.style.unsubscribe(this.#styleSubscription);

    const { drawnObjects } = this.canvas;

    drawnObjects.remove(this);

    for (const object of drawnObjects) {
      object.objectsUnder.delete(this);
    }

    const { objectsUnder } = this;
    const { updateObjects } = this.canvas;

    this.moved = true;
    this.updated = false;
    updateObjects.push(this);

    for (const objectUnder of objectsUnder) {
      objectUnder.moved = true;
      objectUnder.updated = false;
      updateObjects.push(objectUnder);
    }

    const { column, row, width, height } = this.rectangle.peek();

    const rowRange = row + height;
    const columnRange = column + width;
    for (let r = row; r < rowRange; ++r) {
      for (let c = column; c < columnRange; ++c) {
        for (const objectUnder of objectsUnder) {
          objectUnder.queueRerender(r, c);
        }
      }
    }
  }

  queueRerender(row: number, column: number): void {
    this.rerenderCells[row] ??= new Set();

    this.rerenderCells[row].add(column);
  }

  updatePreviousRectangle(): void {
    const { previousRectangle } = this;
    const { column, row, width, height } = this.rectangle.peek();

    if (!previousRectangle) {
      this.previousRectangle = { column, row, width, height };
    } else {
      previousRectangle.column = column;
      previousRectangle.row = row;
      previousRectangle.width = width;
      previousRectangle.height = height;
    }
  }

  updateMovement(): void {
    const { previousRectangle, objectsUnder } = this;
    const rectangle = this.rectangle.peek();

    // Rerender cells that changed because objects position changed
    if (!previousRectangle || rectangleEquals(rectangle, previousRectangle)) return;

    const intersection = rectangleIntersection(rectangle, previousRectangle, true);

    const previousRowRange = previousRectangle.row + previousRectangle.height;
    const previousColumnRange = previousRectangle.column + previousRectangle.width;
    for (let r = previousRectangle.row; r < previousRowRange; ++r) {
      for (let c = previousRectangle.column; c < previousColumnRange; ++c) {
        if (intersection && fitsInRectangle(c, r, intersection)) {
          continue;
        }

        for (const objectUnder of objectsUnder) {
          objectUnder.queueRerender(r, c);
        }
      }
    }

    const rowRange = rectangle.row + rectangle.height;
    const columnRange = rectangle.column + rectangle.width;
    for (let r = rectangle.row; r < rowRange; ++r) {
      for (let c = rectangle.column; c < columnRange; ++c) {
        if (intersection && fitsInRectangle(c, r, intersection)) {
          continue;
        }

        this.queueRerender(r, c);
      }
    }
  }

  updateOutOfBounds(): void {
    // TODO: Make views work as Drawable's
    const { columns, rows } = this.canvas.size.peek();
    const { column, row, width, height } = this.rectangle.peek();

    this.outOfBounds = width === 0 || height === 0 ||
      column >= columns || row >= rows ||
      column + width < 0 || row + height < 0;

    if (!this.outOfBounds) {
      const viewRectangle = this.view.peek()?.rectangle?.peek();
      if (!viewRectangle) return;

      if (
        column > viewRectangle.column + viewRectangle.width ||
        row > viewRectangle.row + viewRectangle.height ||
        column + width < viewRectangle.column || row + height < viewRectangle.row
      ) {
        this.outOfBounds = true;
      }
    }
  }

  update(): void {}

  paint(): void {}
}
