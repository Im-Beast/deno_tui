// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Painter, PainterOptions } from "../painter.ts";
import { Signal, SignalOfObject } from "../../signals/mod.ts";

// FIXME: it renders even when object isn't drawn

import type { Rectangle } from "../../types.ts";
import { signalify } from "../../utils/signals.ts";
import { Subscription } from "../../signals/types.ts";
import { Effect } from "../../signals/effect.ts";
import { textWidth } from "../../utils/strings.ts";
import { jinkReactiveObject, unjinkReactiveObject } from "../../signals/reactivity.ts";
import { cloneArrayContents } from "../../utils/arrays.ts";
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../../utils/numbers.ts";

export interface TextPainterOptions<TextType extends string | string[]> extends PainterOptions {
  text: TextType | Signal<TextType>;
  rectangle: Rectangle | SignalOfObject<Rectangle>;

  alignVertically?: number | Signal<number>;
  alignHorizontally?: number | Signal<number>;

  overwriteRectangle?: boolean | Signal<boolean>;
  multiCodePointSupport?: boolean | Signal<boolean>;
}

/**
 * DrawObject that's responsible for rendering rectangles (boxes).
 */
export class TextPainter<TextType extends string | string[]> extends Painter<"text"> {
  text: Signal<TextType>;
  textType: TextType extends string ? "string" : "object";

  alignVertically: Signal<number>;
  alignHorizontally: Signal<number>;

  overwriteRectangle: Signal<boolean>;
  multiCodePointSupport: Signal<boolean>;

  #rectangleSubscription: Subscription<Rectangle>;

  #text?: TextType;

  #columnStart: number;
  #columnRange: number;

  #rowStart: number;
  #rowRange: number;

  constructor(options: TextPainterOptions<TextType>) {
    super("text", options);

    this.text = signalify(options.text);
    this.textType = (typeof this.text.peek()) as TextType extends string ? "string" : "object";

    this.alignVertically = signalify(options.alignVertically ?? 0);
    this.alignHorizontally = signalify(options.alignHorizontally ?? 0);

    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);
    this.overwriteRectangle = signalify(options.overwriteRectangle ?? false);

    const { updateObjects } = this.canvas;

    this.rectangle = signalify(options.rectangle);
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

    const updateText = (text: TextType) => {
      const textType = typeof text;
      if (textType !== this.textType) {
        throw new Error("You can't change TextPainter's TextType on the fly");
      }

      const alignVertically = this.alignVertically.peek();
      const alignHorizontally = this.alignHorizontally.peek();

      const overwriteRectangle = this.overwriteRectangle.peek();
      const multiCodePointSupport = this.multiCodePointSupport.peek();

      const rectangle = this.rectangle.peek();
      const { column, row, width, height } = rectangle;
      let changed = false;

      if (typeof text === "string") {
        if (text.includes("\n")) {
          throw new Error("TextPainter doesn't support newlines with string TextType, use array string instead");
        }

        const currentText = this.#text as string | undefined;
        if (text === currentText) {
          return;
        }

        if (!overwriteRectangle) {
          jinkReactiveObject(rectangle);
          rectangle.height = 1;
          rectangle.width = textWidth(text);
          unjinkReactiveObject(rectangle);
        }

        if (currentText && currentText !== text) {
          const maxLength = Math.max(text.length, currentText.length);
          for (let c = 0; c < maxLength; ++c) {
            if (text[c] !== currentText[c]) {
              changed = true;
              this.queueRerender(row, column + c);
            }
          }
        }

        this.#text = text;
      } else {
        const currentText = this.#text as string[] | undefined;

        if (!overwriteRectangle) {
          jinkReactiveObject(rectangle);
          rectangle.height = text.length;
          rectangle.width = text.reduce((p, n) => {
            const w = textWidth(n);
            return p > w ? p : w;
          }, 0);
          unjinkReactiveObject(rectangle);
        }

        if (currentText) {
          for (const [r, line] of text.entries()) {
            const currentLine = currentText[r];
            if (line !== currentLine) {
              const maxLength = Math.max(line.length, currentLine.length);

              for (let c = 0; c < maxLength; ++c) {
                if (line[c] !== currentLine[c]) {
                  changed = true;
                  this.queueRerender(row + r, column + c);
                }
              }
            }
          }

          for (const i in text) {
            const line = text[i];

            if (alignHorizontally === 0) {
              currentText[i] = line;
            } else {
              const lineWidth = textWidth(line);

              const lacksLeft = Math.round((width - lineWidth) * alignHorizontally);
              const lacksRight = width - lineWidth - lacksLeft;

              currentText[i] = " ".repeat(lacksLeft) + line + " ".repeat(lacksRight);
            }
          }

          while (currentText.length > text.length) {
            currentText.pop();
          }
        } else {
          const currentText: string[] = [];

          for (const line of text) {
            if (alignHorizontally === 0) {
              currentText.push(line);
            } else {
              const lineWidth = textWidth(line);

              const lacksLeft = Math.round((rectangle.width - lineWidth) * alignHorizontally);
              const lacksRight = rectangle.width - lineWidth - lacksLeft;

              currentText.push(" ".repeat(lacksLeft) + line + " ".repeat(lacksRight));
            }
          }
          this.#text = currentText as TextType;
        }
      }

      const moved = rectangle.width !== width || rectangle.height !== height;
      if (changed || moved) {
        this.updated = false;
        this.moved = true;
        updateObjects.push(this);

        for (const objectUnder of this.objectsUnder) {
          objectUnder.moved = true;
          objectUnder.updated = false;
          updateObjects.push(objectUnder);
        }
      }
    };

    this.text.subscribe(updateText);
    updateText(this.text.peek());

    this.#columnStart = 0;
    this.#columnRange = 0;
    this.#rowStart = 0;
    this.#rowRange = 0;
    let i = 0;
    new Effect(() => {
      ++i;
      this.text.value; // FIXME: this is temporary
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

  // TODO: I'm pretty sure this can be optimized
  updateMovement(): void {
    const { objectsUnder, previousRectangle } = this;
    const rectangle = this.rectangle.peek();

    // Rerender cells that changed because objects position changed
    if (!previousRectangle || rectangleEquals(rectangle, previousRectangle)) return;

    const intersection = rectangleIntersection(rectangle, previousRectangle, true);

    for (let row = previousRectangle.row; row < previousRectangle.row + previousRectangle.height; ++row) {
      for (
        let column = previousRectangle.column;
        column < previousRectangle.column + previousRectangle.width;
        ++column
      ) {
        if (intersection && fitsInRectangle(column, row, intersection)) {
          continue;
        }

        for (const objectUnder of objectsUnder) {
          objectUnder.queueRerender(row, column);
        }
      }
    }

    const hasOriginMoved = rectangle.column !== previousRectangle.column || rectangle.row !== previousRectangle.row;

    for (let row = rectangle.row; row < rectangle.row + rectangle.height; ++row) {
      for (let column = rectangle.column; column < rectangle.column + rectangle.width; ++column) {
        if (hasOriginMoved) {
          this.queueRerender(row, column);
        }

        if (intersection && fitsInRectangle(column, row, intersection)) {
          continue;
        }

        for (const objectUnder of objectsUnder) {
          objectUnder.queueRerender(row, column);
        }
      }
    }
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

    if (typeof text === "string") {
      const row = rowStart;

      const rerenderColumns = rerenderCells[row];
      if (!rerenderColumns && painted) return;

      const omitColumns = omitCells[row];
      if (omitColumns?.size === rectangle.width) {
        return;
      }

      if (painted) {
        for (const column of rerenderColumns) {
          if (column < columnStart || column >= columnRange || omitColumns?.has(column)) {
            continue;
          }

          const char = text[column - columnStart];
          if (!char) continue;

          canvas.draw(row, column, style(char));
        }

        rerenderColumns.clear();
      } else {
        for (let column = columnStart; column < columnRange; ++column) {
          if (omitColumns?.has(column)) {
            continue;
          }

          const char = text[column - columnStart];
          if (!char) continue;

          canvas.draw(row, column, style(char));
        }
      }
    } else {
      for (let row = rowStart; row < rowRange; ++row) {
        if (!(row in rerenderCells) && painted) continue;

        const rerenderColumns = rerenderCells[row];
        if (!rerenderColumns && painted) break;

        const omitColumns = omitCells[row];
        if (omitColumns?.size === rectangle.width) {
          continue;
        }

        const lineIndex = row - rowStart;
        const line = text![lineIndex];

        if (painted) {
          for (const column of rerenderColumns) {
            if (column < columnStart || column >= columnRange || omitColumns?.has(column)) {
              continue;
            }

            const char = line[column - columnStart] ?? " ";

            canvas.draw(row, column, style(char));
          }

          rerenderColumns.clear();
        } else {
          for (let column = columnStart; column < columnRange; ++column) {
            if (omitColumns?.has(column)) {
              continue;
            }

            const char = line[column - columnStart] ?? " ";
            canvas.draw(row, column, style(char));
          }
        }
      }
    }

    this.painted = true;
  }
}
