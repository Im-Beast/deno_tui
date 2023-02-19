import { Rectangle } from "../types.ts";
import { fitsInRectangle } from "../utils/numbers.ts";
import { Canvas, DrawObject, DrawObjectOptions } from "./canvas.ts";

export interface DrawBoxOptions extends DrawObjectOptions<"box"> {
  rectangle: Rectangle;
  filler?: string;
}

export class BoxObject extends DrawObject<"box"> {
  filler: string;

  constructor(options: DrawBoxOptions) {
    super("box", options);
    this.rectangle = options.rectangle;
    this.filler = options.filler ?? " ";
  }

  render(canvas: Canvas): void {
    const { rectangle, style, filler, omitCells } = this;
    const { columns, rows } = canvas.size;
    const { frameBuffer, rerenderQueue } = canvas;

    // Render box
    for (let row = rectangle.row; row < rectangle.row + rectangle.height; ++row) {
      if (row < 0) continue;
      else if (row >= rows) break;

      const rowBuffer = frameBuffer[row];
      const omitColumns = omitCells[row];
      const rerenderQueueRow = rerenderQueue[row] ??= new Set();

      if (omitColumns?.size === rectangle.width) {
        omitColumns?.clear();
        continue;
      }

      for (
        let column = rectangle.column;
        column < rectangle.column + rectangle.width;
        ++column
      ) {
        if (column < 0 || omitColumns?.has(column)) continue;
        else if (column >= columns) break;

        rowBuffer[column] = style(filler);

        rerenderQueueRow.add(column);
      }

      omitColumns?.clear();
    }
  }

  rerender(canvas: Canvas): void {
    const { rerenderCells, style, filler, rectangle, omitCells } = this;
    const { columns, rows } = canvas.size;
    const { frameBuffer, rerenderQueue } = canvas;

    for (const key in rerenderCells) {
      const row = +key;
      if (row < 0 || row >= rows) continue;

      const rerenderColumns = rerenderCells[key];
      const omitColumns = omitCells[row];
      const rowBuffer = frameBuffer[row];
      const rerenderQueueRow = rerenderQueue[row] ??= new Set();

      if (omitColumns?.size === rectangle.width) {
        omitColumns?.clear();
        continue;
      }

      for (const column of rerenderColumns) {
        if (
          column < 0 || column >= columns ||
          !fitsInRectangle(column, row, rectangle) || omitColumns?.has(column)
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
