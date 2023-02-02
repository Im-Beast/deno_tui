import { fitsInRectangle } from "../utils/numbers.ts";
import { Canvas, compareOmitCellRange, DrawObject, DrawObjectOptions, pushToPointedArray } from "./canvas.ts";

export interface DrawBoxOptions extends DrawObjectOptions<"box"> {
  filler?: string;
}

export class BoxObject extends DrawObject<"box"> {
  filler: string;

  constructor(options: DrawBoxOptions) {
    super("box", options);
    this.filler = options.filler ?? " ";
  }

  render(canvas: Canvas): void {
    const { rectangle, style, filler, omitCells, omitCellsPointer } = this;
    const { columns, rows } = canvas.size;
    const { frameBuffer, rerenderQueue } = canvas;

    // Render box
    for (let row = rectangle.row; row < rectangle.row + rectangle.height; ++row) {
      if (row < 0) continue;
      else if (row >= rows) break;

      const rowBuffer = frameBuffer[row];

      for (
        let column = rectangle.column;
        column < rectangle.column + rectangle.width;
        ++column
      ) {
        if (column < 0) continue;
        else if (column >= columns) break;

        if (compareOmitCellRange(row, column, omitCells, omitCellsPointer)) {
          continue;
        }

        rowBuffer[column] = style(filler);
        pushToPointedArray(rerenderQueue, canvas.rerenderQueuePointer++, row, column);
      }
    }
  }

  rerender(canvas: Canvas): void {
    const { rerenderCells, rerenderCellsPointer, style, filler, rectangle, omitCells, omitCellsPointer } = this;
    const { columns, rows } = canvas.size;
    const { frameBuffer, rerenderQueue } = canvas;

    for (let i = 0; i < rerenderCellsPointer; i += 2) {
      const row = rerenderCells[i];
      if (row < 0 || row >= rows) continue;

      const column = rerenderCells[i + 1];

      if (
        column < 0 || column >= columns || !fitsInRectangle(column, row, rectangle) ||
        compareOmitCellRange(row, column, omitCells, omitCellsPointer)
      ) {
        continue;
      }

      frameBuffer[row][column] = style(filler);
      pushToPointedArray(rerenderQueue, canvas.rerenderQueuePointer++, row, column);
    }

    this.rerenderCellsPointer = 0;
  }
}
