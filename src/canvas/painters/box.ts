// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Painter, PainterOptions } from "../painter.ts";
import { Signal } from "../../signals/mod.ts";

import type { Rectangle } from "../../types.ts";
import { signalify } from "../../utils/signals.ts";
import { Subscription } from "../../signals/types.ts";
import { Effect } from "../../signals/effect.ts";

export interface BoxPainterOptions extends PainterOptions {
  rectangle: Rectangle | Signal<Rectangle>;
  filler?: string | Signal<string>;
}

/**
 * DrawObject that's responsible for rendering rectangles (boxes).
 */
export class BoxPainter extends Painter<"box"> {
  filler: Signal<string>;
  #rectangleSubscription: Subscription<Rectangle>;

  #filler: string;

  #columnStart: number;
  #columnRange: number;

  #rowStart: number;
  #rowRange: number;

  constructor(options: BoxPainterOptions) {
    super("box", options);

    this.rectangle = signalify(options.rectangle);
    this.filler = signalify(options.filler ?? " ");

    const filler = this.filler.peek();
    this.#filler = this.style.peek()?.(filler) ?? filler;

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

    new Effect(() => {
      const style = this.style.value;
      const filler = this.filler.value;
      this.#filler = style?.(filler) ?? filler;
    });

    this.#columnStart = 0;
    this.#columnRange = 0;
    this.#rowStart = 0;
    this.#rowRange = 0;

    new Effect(() => {
      const size = this.canvas.size.value;
      const rectangle = this.rectangle.value;
      const view = this.view.value;
      const viewRectangle = view?.rectangle.value;

      let rowStart = rectangle.row;
      let rowRange = Math.min(rectangle.row + rectangle.height, size.rows);

      let columnStart = rectangle.column;
      let columnRange = Math.min(rectangle.column + rectangle.width, size.columns);

      if (viewRectangle) {
        rowStart = Math.max(rowStart, viewRectangle.row);
        columnStart = Math.max(columnStart, viewRectangle.column);
        rowRange = Math.min(rowRange, viewRectangle.row + viewRectangle.height);
        columnRange = Math.min(columnRange, viewRectangle.column + viewRectangle.width);
      }

      this.#rowStart = rowStart;
      this.#rowRange = rowRange;

      this.#columnStart = columnStart;
      this.#columnRange = columnRange;
    });
  }

  draw(): void {
    this.rectangle.subscribe(this.#rectangleSubscription);
    super.draw();
  }

  erase(): void {
    this.rectangle.unsubscribe(this.#rectangleSubscription);
    super.erase();
  }

  paint(): void {
    const { canvas, rerenderCells, omitCells, painted } = this;

    const rectangle = this.rectangle.peek();
    const filler = this.#filler;

    const rowStart = this.#rowStart;
    const rowRange = this.#rowRange;

    const columnStart = this.#columnStart;
    const columnRange = this.#columnRange;

    for (let row = rowStart; row < rowRange; ++row) {
      if (!(row in rerenderCells) && painted) continue;

      const rerenderColumns = rerenderCells[row];
      if (!rerenderColumns && painted) break;

      const omitColumns = omitCells[row];
      if (omitColumns?.size === rectangle.width) {
        continue;
      }

      if (painted) {
        for (const column of rerenderColumns) {
          if (column < columnStart || column >= columnRange || omitColumns?.has(column)) {
            continue;
          }

          canvas.draw(row, column, filler);
        }

        rerenderColumns.clear();
      } else {
        for (let column = columnStart; column < columnRange; ++column) {
          if (omitColumns?.has(column)) {
            continue;
          }

          canvas.draw(row, column, filler);
        }
      }
    }

    this.painted = true;
  }
}
