import { Dynamic, PossibleDynamic, setPossibleDynamicProperty } from "../utils/dynamic.ts";
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";

import type { Style } from "../theme.ts";
import type { Canvas } from "./canvas.ts";
import type { Offset, Rectangle } from "../types.ts";
import { View } from "../view.ts";

export interface DrawObjectOptions {
  canvas: Canvas;

  omitCells?: number[];
  omitCellsPointer?: number;

  view?: PossibleDynamic<View | undefined>;
  style: PossibleDynamic<Style>;
  zIndex?: PossibleDynamic<number>;
}

let id = 0;
export class DrawObject<Type extends string = string> {
  id: number;
  type: Type;

  canvas: Canvas;

  style!: Style;
  previousStyle?: Style;

  view: View | undefined;
  viewOffset: Offset;
  rectangle!: Rectangle;
  previousRectangle?: Rectangle;

  objectsUnder: DrawObject[];
  objectsUnderPointer: number;

  omitCells: Set<number>[];
  rerenderCells: Set<number>[];

  zIndex!: number;
  rendered: boolean;
  outOfBounds: boolean;

  dynamicView?: Dynamic<View | undefined>;
  dynamicZIndex?: Dynamic<number>;
  dynamicStyle?: Dynamic<Style>;
  dynamicRectangle?: Dynamic<Rectangle>;

  constructor(type: Type, options: DrawObjectOptions) {
    this.id = id++;
    this.type = type;

    this.canvas = options.canvas;

    this.viewOffset = { columns: 0, rows: 0 };

    setPossibleDynamicProperty(this, "view", options.view);
    setPossibleDynamicProperty(this, "style", options.style);
    setPossibleDynamicProperty(this, "zIndex", options.zIndex ?? 0);

    this.rerenderCells = [];
    this.omitCells = [];

    this.objectsUnderPointer = 0;
    this.objectsUnder = [];

    this.rendered = false;
    this.outOfBounds = false;
  }

  draw(): void {
    this.rendered = false;
    this.canvas.drawnObjects.push(this);
  }

  erase(): void {
    this.canvas.drawnObjects.remove(this);

    const { objectsUnder } = this;
    const { column, row, width, height } = this.rectangle;

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
    const viewRectangle = this.view?.rectangle;
    if (row < 0 || column < 0) return;
    const { columns, rows } = this.canvas.size;
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
    const { column, row, width, height } = this.rectangle;

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
    const { rectangle, previousRectangle, objectsUnder } = this;

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

        for (const objectUnder of objectsUnder) {
          objectUnder.queueRerender(r, c);
        }

        this.queueRerender(r, c);
      }
    }
  }

  updateOutOfBounds(): void {
    const { columns, rows } = this.canvas.size;
    const { column, row, width, height } = this.rectangle;

    this.outOfBounds = width === 0 || height === 0 ||
      column > columns || row > rows ||
      column + width < 0 || row + height < 0;
  }

  update(): void {
    if (this.dynamicView) this.view = this.dynamicView();
    if (this.dynamicStyle) this.style = this.dynamicStyle();
    if (this.dynamicZIndex) this.zIndex = this.dynamicZIndex();
    if (this.dynamicRectangle) this.rectangle = this.dynamicRectangle();

    const { style } = this;
    if (style !== this.previousStyle) this.rendered = false;
    this.previousStyle = style;

    const { rectangle } = this;
    const { column, row, width, height } = rectangle;

    const viewRectangle = this.view?.rectangle;
    if (viewRectangle) {
      const { offset } = this.view!;
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
        this.updateMovement();
        this.outOfBounds = true;
      }
    }
  }

  render(): void {
    const { column, row, width, height } = this.rectangle;

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
