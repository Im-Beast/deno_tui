import { DrawObject, DrawObjectOptions } from "./draw_object.ts";

import { fitsInRectangle } from "../utils/numbers.ts";

import type { Rectangle } from "../types.ts";

export interface BoxObjectOptions extends DrawObjectOptions {
  rectangle: Rectangle;
  filler?: string;
}

export class BoxObject extends DrawObject<"box"> {
  filler: string;

  constructor(options: BoxObjectOptions) {
    super("box", options);
    this.rectangle = options.rectangle;
    this.filler = options.filler ?? " ";
  }

  render(): void {
    const { canvas, rectangle, style, filler, omitCells } = this;
    const { frameBuffer, rerenderQueue } = canvas;
    const { columns } = canvas.size;

    // Render box
    for (let row = rectangle.row; row < rectangle.row + rectangle.height; ++row) {
      const omitColumns = omitCells[row];

      if (omitColumns?.size === rectangle.width) {
        omitColumns?.clear();
        continue;
      }

      const rowBuffer = frameBuffer[row];
      if (!rowBuffer) break;
      const rerenderQueueRow = rerenderQueue[row] ??= new Set();

      for (
        let column = rectangle.column;
        column < rectangle.column + rectangle.width;
        ++column
      ) {
        if (column >= columns || omitColumns?.has(column)) continue;

        rowBuffer[column] = style(filler);
        rerenderQueueRow.add(column);
      }

      omitColumns?.clear();
    }
  }

  rerender(): void {
    const { canvas, rerenderCells, style, filler, rectangle, omitCells } = this;
    const { frameBuffer, rerenderQueue } = canvas;
    const { columns } = canvas.size;

    for (const key in rerenderCells) {
      const row = +key;

      const rerenderColumns = rerenderCells[key];
      if (!rerenderColumns) break;

      const omitColumns = omitCells[row];

      if (omitColumns?.size === rectangle.width) {
        omitColumns?.clear();
        continue;
      }

      const rowBuffer = frameBuffer[row];
      const rerenderQueueRow = rerenderQueue[row] ??= new Set();

      for (const column of rerenderColumns) {
        if (
          !fitsInRectangle(column, row, rectangle) ||
          omitColumns?.has(column) ||
          column >= columns
        ) {
          continue;
        }

        rowBuffer[column] = style(filler);
        rerenderQueueRow.add(column);
      }

      rerenderColumns.clear();
      omitColumns?.clear();
    }
  }
}
