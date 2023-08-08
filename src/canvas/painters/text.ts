// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Painter, PainterOptions } from "../painter.ts";
import { Signal, SignalOfObject } from "../../signals/mod.ts";

import type { Rectangle } from "../../types.ts";
import { signalify } from "../../utils/signals.ts";
import { Subscription } from "../../signals/types.ts";
import { Effect } from "../../signals/effect.ts";
import { textWidth } from "../../utils/strings.ts";

export interface TextPainterOptions extends PainterOptions {
  text: string[] | Signal<string[]>;
  rectangle: Rectangle | SignalOfObject<Rectangle>;
  multiCodePointSupport?: boolean | Signal<boolean>;
}

/**
 * DrawObject that's responsible for rendering rectangles (boxes).
 */
export class TextPainter extends Painter<"box"> {
  text: Signal<string[]>;
  multiCodePointSupport: Signal<boolean>;

  #rectangleSubscription: Subscription<Rectangle>;

  #text: string[];

  #columnStart: number;
  #columnRange: number;

  #rowStart: number;
  #rowRange: number;

  constructor(options: TextPainterOptions) {
    super("box", options);

    this.text = signalify(options.text);
    this.rectangle = signalify(options.rectangle);
    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);

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

    this.#text = Array.from(this.text.peek());
    this.text.subscribe((text) => {
      const currentText = this.#text;
      const rectangle = this.rectangle.peek();

      rectangle.height = text.length;
      rectangle.width = text.reduce((p, n) => {
        const w = textWidth(n);
        return p > w ? p : w;
      }, 0);

      const { column, row } = rectangle;

      for (const [r, line] of text.entries()) {
        const currentLine = currentText[r];
        if (line !== currentLine) {
          for (const c in line) {
            if (line[c] !== currentLine[c]) {
              this.queueRerender(row + r, column + +c);
            }
          }

          currentText[r] = line;
        }
      }
    });

    this.#columnStart = 0;
    this.#columnRange = 0;
    this.#rowStart = 0;
    this.#rowRange = 0;
    let i = 0;
    new Effect(() => {
      ++i;
      const text = this.text.value;
      const size = this.canvas.size.value;
      const rectangle = this.rectangle.value;
      const view = this.view.value;
      const viewRectangle = view?.rectangle.value;

      rectangle.height = text.length;
      rectangle.width = text.reduce((p, n) => {
        const w = textWidth(n);
        return p > w ? p : w;
      }, 0);

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

      this.moved = true;
      this.updated = false;
      updateObjects.push(this);

      for (const objectUnder of this.objectsUnder) {
        objectUnder.moved = true;
        objectUnder.updated = false;
        updateObjects.push(objectUnder);
      }
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
    const style = this.style.peek();
    const text = this.#text;

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

      const lineIndex = row - rowStart;
      const line = text[lineIndex];

      if (painted) {
        for (const column of rerenderColumns) {
          if (column < columnStart || column >= columnRange || omitColumns?.has(column)) {
            continue;
          }

          const char = line[column - columnStart];
          if (!char) continue;

          canvas.draw(row, column, style(char));
        }

        rerenderColumns.clear();
      } else {
        for (let column = columnStart; column < columnRange; ++column) {
          if (omitColumns?.has(column)) {
            continue;
          }

          const char = line[column - columnStart];
          if (!char) continue;

          canvas.draw(row, column, style(char));
        }
      }
    }

    this.painted = true;
  }
}
