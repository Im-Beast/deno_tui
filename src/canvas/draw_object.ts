// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";

import type { Style } from "../theme.ts";
import type { Canvas } from "./canvas.ts";
import type { Offset, Rectangle } from "../types.ts";
import { View } from "../view.ts";
import { Signal } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";

export interface DrawObjectOptions {
  canvas: Canvas;

  omitCells?: number[];
  omitCellsPointer?: number;

  view?: View | Signal<View | undefined>;
  style: Style | Signal<Style>;
  zIndex: number | Signal<number>;
}

let id = 0;

/**
 * Base DrawObject which works as a skeleton for creating
 * draw objects which actually do something
 */
export class DrawObject<Type extends string = string> {
  id: number;
  type: Type;

  canvas: Canvas;

  style: Signal<Style>;
  zIndex: Signal<number>;

  view: Signal<View | undefined>;
  viewOffset: Offset;

  rectangle!: Signal<Rectangle>;
  previousRectangle?: Rectangle;

  objectsUnder: Set<DrawObject>;

  omitCells: Set<number>[];
  rerenderCells: Set<number>[];

  rendered: boolean;
  outOfBounds: boolean;
  needsToUpdateIntersections: boolean;

  constructor(type: Type, options: DrawObjectOptions) {
    this.id = id++;
    this.type = type;

    this.canvas = options.canvas;

    this.viewOffset = { columns: 0, rows: 0 };

    this.omitCells = [];
    this.rerenderCells = [];

    this.objectsUnder = new Set();

    this.rendered = false;
    this.outOfBounds = false;
    this.needsToUpdateIntersections = true;

    this.view = signalify(options.view);
    this.zIndex = signalify(options.zIndex);
    this.style = signalify(options.style);

    this.style.subscribe(() => {
      this.rendered = false;
      this.needsToUpdateIntersections = true;
      for (const objectUnder of this.objectsUnder) {
        objectUnder.needsToUpdateIntersections = true;
      }
    });
  }

  draw(): void {
    this.rendered = false;
    this.canvas.drawnObjects.push(this);
  }

  erase(): void {
    this.canvas.drawnObjects.remove(this);

    const { objectsUnder } = this;
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
    const viewRectangle = this.view.peek()?.rectangle;
    if (row < 0 || column < 0) return;
    const { columns, rows } = this.canvas.size.peek();
    if (row >= rows || column >= columns) return;

    if (
      viewRectangle && (
        row < viewRectangle.row || column < viewRectangle.column ||
        row >= viewRectangle.row + viewRectangle.height || column >= viewRectangle.column + viewRectangle.width
      )
    ) return;

    (this.rerenderCells[row] ??= new Set()).add(column);
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
    const { columns, rows } = this.canvas.size.peek();
    const { column, row, width, height } = this.rectangle.peek();

    this.outOfBounds = width === 0 || height === 0 ||
      column > columns || row > rows ||
      column + width < 0 || row + height < 0;
  }

  update(): void {
    const rectangle = this.rectangle.peek();
    const { column, row, width, height } = rectangle;

    const view = this.view.peek();
    if (!view) return;

    const viewRectangle = view.rectangle;
    const { offset } = view;
    const { viewOffset } = this;

    rectangle.column += viewRectangle.column - offset.columns - viewOffset.columns;
    rectangle.row += viewRectangle.row - offset.rows - viewOffset.rows;

    viewOffset.columns = viewRectangle.column - offset.columns;
    viewOffset.rows = viewRectangle.row - offset.rows;

    if (
      column > viewRectangle.column + viewRectangle.width ||
      row > viewRectangle.row + viewRectangle.height ||
      column + width < viewRectangle.column || row + height < viewRectangle.row
    ) {
      this.outOfBounds = true;
    }
  }

  render(): void {
    const { column, row, width, height } = this.rectangle.peek();

    const rowRange = row + height;
    const columnRange = column + width;
    for (let r = row; r < rowRange; ++r) {
      for (let c = column; c < columnRange; ++c) {
        this.queueRerender(r, c);
      }
    }
    this.rerender();
  }

  rerender(): void {}
}
