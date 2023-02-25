import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";

import type { Style } from "../theme.ts";
import type { Canvas } from "./canvas.ts";
import type { Rectangle } from "../types.ts";

export interface DrawObjectOptions<Type extends string = string> {
  omitCells?: number[];
  omitCellsPointer?: number;

  style: Style;
  zIndex?: number;
}

export class DrawObject<Type extends string = string> {
  type: Type;

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

  constructor(type: Type, options: DrawObjectOptions) {
    this.type = type;
    this.rendered = false;
    this.style = options.style;

    this.rerenderCells = [];
    this.omitCells = [];

    this.objectsUnderPointer = 0;
    this.objectsUnder = [];

    this.zIndex = options.zIndex ?? 0;
  }

  queueRerender(row: number, column: number): void {
    (this.rerenderCells[row] ??= new Set()).add(column);
  }

  updatePreviousRectangle(): void {
    const { rectangle, previousRectangle } = this;

    if (!previousRectangle) {
      this.previousRectangle = {
        column: rectangle.column,
        row: rectangle.row,
        width: rectangle.width,
        height: rectangle.height,
      };
    } else {
      previousRectangle.column = rectangle.column;
      previousRectangle.row = rectangle.row;
      previousRectangle.height = rectangle.height;
      previousRectangle.width = rectangle.width;
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
    const { style } = this;

    if (style !== this.previousStyle) {
      this.rendered = false;
    }

    this.previousStyle = style;
  }

  render(_canvas: Canvas): void {}
  rerender(_canvas: Canvas): void {}
}
