import { Dynamic, isDynamic, PossibleDynamic } from "../utils/dynamic.ts";
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";

import type { Style } from "../theme.ts";
import type { Canvas } from "./canvas.ts";
import type { Rectangle } from "../types.ts";

export interface DrawObjectOptions {
  canvas: Canvas;

  omitCells?: number[];
  omitCellsPointer?: number;

  style: PossibleDynamic<Style>;
  zIndex?: PossibleDynamic<number>;
}

let id = 0;
export class DrawObject<Type extends string = string> {
  id: number;
  type: Type;

  canvas: Canvas;

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
  outOfBounds: boolean;

  dynamicZIndex?: Dynamic<number>;
  dynamicStyle?: Dynamic<Style>;
  dynamicRectangle?: Dynamic<Rectangle>;

  constructor(type: Type, options: DrawObjectOptions) {
    this.id = id++;
    this.type = type;

    this.canvas = options.canvas;

    if (isDynamic(options.style)) {
      this.style = options.style();
      this.dynamicStyle = options.style;
    } else {
      this.style = options.style;
    }

    if (isDynamic(options.zIndex)) {
      this.zIndex = options.zIndex();
      this.dynamicZIndex = options.zIndex;
    } else {
      this.zIndex = options.zIndex ?? 0;
    }

    this.rerenderCells = [];
    this.omitCells = [];

    this.objectsUnderPointer = 0;
    this.objectsUnder = [];

    this.rendered = false;
    this.outOfBounds = false;
  }

  draw() {
    this.rendered = false;
    this.canvas.drawnObjects.push(this);
  }

  erase() {
    this.canvas.drawnObjects.remove(this);

    const { objectsUnder } = this;
    const { column, row, width, height } = this.rectangle;
    for (let r = row; r < row + height; ++r) {
      for (let c = column; c < column + width; ++c) {
        for (const objectUnder of objectsUnder) {
          objectUnder.queueRerender(r, c);
        }
      }
    }
  }

  queueRerender(row: number, column: number): void {
    if (row < 0 || column < 0) return;
    const { columns, rows } = this.canvas.size;
    if (row >= rows || column >= columns) return;

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
    if (previousRectangle && !rectangleEquals(rectangle, previousRectangle)) {
      const intersection = rectangleIntersection(rectangle, previousRectangle, true);

      for (let r = previousRectangle.row; r < previousRectangle.row + previousRectangle.height; ++r) {
        for (let c = previousRectangle.column; c < previousRectangle.column + previousRectangle.width; ++c) {
          if (intersection && fitsInRectangle(c, r, intersection)) {
            continue;
          }

          for (const objectUnder of objectsUnder) {
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
    if (this.dynamicRectangle) this.rectangle = this.dynamicRectangle();
    if (this.dynamicStyle) this.style = this.dynamicStyle();
    if (this.dynamicZIndex) this.zIndex = this.dynamicZIndex();

    const { style } = this;

    if (style !== this.previousStyle) this.rendered = false;
    this.previousStyle = style;

    const { column, row, width, height } = this.rectangle;
    const { columns, rows } = this.canvas.size;
    this.outOfBounds = column + width < 0 || row + height < 0 || column > columns || row > rows;
  }

  render(): void {}
  rerender(): void {}
}
