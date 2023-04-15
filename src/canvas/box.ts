import { DrawObject, DrawObjectOptions } from "./draw_object.ts";
import { Dynamic, PossibleDynamic, setPossibleDynamicProperty } from "../utils/dynamic.ts";

import type { Rectangle } from "../types.ts";

export interface BoxObjectOptions extends DrawObjectOptions {
  rectangle: PossibleDynamic<Rectangle>;
  filler?: PossibleDynamic<string>;
}

export class BoxObject extends DrawObject<"box"> {
  filler!: string;
  dynamicFiller?: Dynamic<string>;

  constructor(options: BoxObjectOptions) {
    super("box", options);
    setPossibleDynamicProperty(this, "rectangle", options.rectangle);
    setPossibleDynamicProperty(this, "filler", options.filler ?? " ");
  }

  rerender(): void {
    const { canvas, rerenderCells, style, filler, rectangle, omitCells } = this;
    const { frameBuffer, rerenderQueue } = canvas;
    const { rows, columns } = canvas.size;

    let rowRange = Math.min(rectangle.row + rectangle.height, rows);
    let columnRange = Math.min(rectangle.column + rectangle.width, columns);

    const viewRectangle = this.view?.rectangle;
    if (viewRectangle) {
      rowRange = Math.min(rowRange, viewRectangle.row + viewRectangle.height);
      columnRange = Math.min(columnRange, viewRectangle.column + viewRectangle.width);
    }

    for (let row = rectangle.row; row < rerenderCells.length; ++row) {
      if (!(row in rerenderCells)) continue;
      else if (row >= rowRange) continue;

      const rerenderColumns = rerenderCells[row];
      if (!rerenderColumns) break;

      const omitColumns = omitCells[row];

      if (!rerenderColumns.size || omitColumns?.size === rectangle.width) {
        omitColumns?.clear();
        continue;
      }

      const rowBuffer = frameBuffer[row];
      const rerenderQueueRow = rerenderQueue[row] ??= new Set();

      for (const column of rerenderColumns) {
        if (omitColumns?.has(column) || column < rectangle.column || column >= columnRange) {
          continue;
        }

        rowBuffer[column] = style(filler);
        rerenderQueueRow.add(column);
      }

      rerenderColumns.clear();
      omitColumns?.clear();
    }
  }

  update(): void {
    super.update();
    if (this.dynamicFiller) this.filler = this.dynamicFiller();
  }
}
