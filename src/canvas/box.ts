import { DrawObject, DrawObjectOptions } from "./draw_object.ts";
import { Dynamic, isDynamic, PossibleDynamic } from "../utils/dynamic.ts";

import { fitsInRectangle } from "../utils/numbers.ts";

import type { Rectangle } from "../types.ts";

export interface BoxObjectOptions extends DrawObjectOptions {
  rectangle: PossibleDynamic<Rectangle>;
  filler?: PossibleDynamic<string>;
}

export class BoxObject extends DrawObject<"box"> {
  filler: string;
  dynamicFiller?: Dynamic<string>;

  constructor(options: BoxObjectOptions) {
    super("box", options);
    setPossibleDynamicProperty(this, "rectangle", options.rectangle);
    setPossibleDynamicProperty(this, "filler", options.filler ?? " ");
  }

    if (isDynamic(options.rectangle)) {
      this.rectangle = options.rectangle();
      this.dynamicRectangle = options.rectangle;
    } else {
      this.rectangle = options.rectangle;
    }
  }

  render(): void {
    const { canvas, rectangle, style, filler, omitCells } = this;
    const { frameBuffer, rerenderQueue } = canvas;
    const { columns } = canvas.size;

    // Render box
    for (let row = rectangle.row; row < rectangle.row + rectangle.height; ++row) {
      const omitColumns = omitCells[row];

      if (omitColumns?.size === rectangle.width) {
        omitColumns.clear();
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

  update(): void {
    super.update();
    if (this.dynamicFiller) this.filler = this.dynamicFiller();
  }
}
