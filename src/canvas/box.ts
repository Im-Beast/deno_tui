// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { DrawObject, DrawObjectOptions } from "./draw_object.ts";
import { Signal } from "../signals/mod.ts";

import type { Rectangle } from "../types.ts";
import { signalify } from "../utils/signals.ts";

export interface BoxObjectOptions extends DrawObjectOptions {
  rectangle: Rectangle | Signal<Rectangle>;
  filler?: string | Signal<string>;
}

/**
 * DrawObject that's responsible for rendering rectangles (boxes).
 */
export class BoxObject extends DrawObject<"box"> {
  filler: Signal<string>;

  constructor(options: BoxObjectOptions) {
    super("box", options);

    this.rectangle = signalify(options.rectangle);
    this.filler = signalify(options.filler ?? " ");

    this.rectangle.subscribe(() => {
      this.needsToUpdateIntersections = true;
      for (const objectUnder of this.objectsUnder) {
        objectUnder.needsToUpdateIntersections = true;
      }
    });
  }

  rerender(): void {
    const { canvas, rerenderCells, omitCells } = this;
    const { frameBuffer, rerenderQueue } = canvas;
    const { rows, columns } = canvas.size.peek();

    const rectangle = this.rectangle.peek();
    const style = this.style.peek();
    const filler = this.filler.peek();

    let rowRange = Math.min(rectangle.row + rectangle.height, rows);
    let columnRange = Math.min(rectangle.column + rectangle.width, columns);

    const viewRectangle = this.view.peek()?.rectangle;
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

      if (omitColumns?.size === rectangle.width) {
        continue;
      }

      const rowBuffer = frameBuffer[row] ??= [];
      const rerenderQueueRow = rerenderQueue[row] ??= new Set();

      for (const column of rerenderColumns) {
        if (omitColumns?.has(column) || column < rectangle.column || column >= columnRange) {
          continue;
        }

        rowBuffer[column] = style(filler);
        rerenderQueueRow.add(column);
      }

      rerenderColumns.clear();
    }
  }
}
