// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Painter, PainterOptions } from "../painter.ts";
import { Signal, SignalOfObject } from "../../signals/mod.ts";

import type { Rectangle } from "../../types.ts";
import { signalify } from "../../utils/signals.ts";
import { Subscription } from "../../signals/types.ts";

export interface BoxPainterOptions extends PainterOptions {
  rectangle: Rectangle | SignalOfObject<Rectangle>;
  filler?: string | Signal<string>;
}

/**
 * DrawObject that's responsible for rendering rectangles (boxes).
 */
export class BoxPainter extends Painter<"box"> {
  filler: Signal<string>;

  #rectangleSubscription: Subscription<Rectangle>;

  constructor(options: BoxPainterOptions) {
    super("box", options);

    this.rectangle = signalify(options.rectangle);
    this.filler = signalify(options.filler ?? " ");

    const { updateObjects } = this.canvas;

    this.#rectangleSubscription = () => {
      this.moved = true;
      this.updated = false;
      updateObjects.push(this);

      for (const objectUnder of this.objectsUnder) {
        objectUnder.moved = true;
        objectUnder.updated = false;
        updateObjects.push(objectUnder);
      }
    };
  }

  draw(): void {
    this.rectangle.subscribe(this.#rectangleSubscription);
    super.draw();
  }

  erase(): void {
    this.rectangle.unsubscribe(this.#rectangleSubscription);
    super.erase();
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

    const viewRectangle = this.view.peek()?.rectangle?.peek();
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

      const rerenderQueueRow = rerenderQueue[row] ??= new Set();

      for (const column of rerenderColumns) {
        if (omitColumns?.has(column) || column < rectangle.column || column >= columnRange) {
          continue;
        }

        canvas.draw(row, column, style(filler));
        rerenderQueueRow.add(column);
      }

      rerenderColumns.clear();
    }
  }
}
