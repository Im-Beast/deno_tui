// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Painter, PainterOptions } from "../painter.ts";
import { Signal, SignalOfObject } from "../../signals/mod.ts";

// FIXME: it renders even when object isn't drawn
// FIXME: support for characters of different width than 1

import type { Rectangle } from "../../types.ts";
import { signalify } from "../../utils/signals.ts";
import { Subscription } from "../../signals/types.ts";
import { Effect } from "../../signals/effect.ts";
import { cropToWidth, getMultiCodePointCharacters, textWidth } from "../../utils/strings.ts";
import { jinkReactiveObject, unjinkReactiveObject } from "../../signals/reactivity.ts";
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

  #text?:
    // Single line text, no newlines
    | string
    // Single line text with `multiCodePointSupport` enabled
    // Multiline text with `multiCodePointSupport` disabled
    | string[]
    // Multiline text with `multiCodePointSupport` enabled
    | string[][];

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
        const currentText = this.#text as string[] | string[][] | undefined;

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
          const textLength = text.length;
          const lacksTop = Math.round((rectangle.height - textLength) * alignVertically);
          const lacksBottom = rectangle.height - textLength - lacksTop;

          const wholeSpaceWidth = " ".repeat(rectangle.width);
          for (let i = 0; i < lacksTop; ++i) {
            currentText[i] = wholeSpaceWidth;
          }

          for (let i = lacksTop + textLength; i < lacksTop + textLength + lacksBottom; ++i) {
            currentText[i] = wholeSpaceWidth;
          }

          for (let [r, line] of text.entries()) {
            const actualLineRow = r + lacksTop;
            const currentLine = currentText[actualLineRow];

            if (overwriteRectangle) {
              line = cropToWidth(line, rectangle.width);
            }

            if (line !== currentLine) {
              const maxLength = Math.max(line.length, currentLine.length);

              for (let c = 0; c < maxLength; ++c) {
                if (line[c] !== currentLine[c]) {
                  changed = true;
                  this.queueRerender(row + actualLineRow, column + c);
                }
              }
            }

            if (alignHorizontally === 0) {
              currentText[actualLineRow] = multiCodePointSupport ? getMultiCodePointCharacters(line) : line;
            } else {
              const lineWidth = textWidth(line);

              const lacksLeft = Math.round((width - lineWidth) * alignHorizontally);
              const lacksRight = width - lineWidth - lacksLeft;

              let alignedLine: string | string[] = " ".repeat(lacksLeft) + line + " ".repeat(lacksRight);
              if (multiCodePointSupport) {
                alignedLine = getMultiCodePointCharacters(alignedLine);
              }

              currentText[actualLineRow] = alignedLine as string;
            }
          }

          while (currentText.length > rectangle.height) {
            currentText.pop();
          }
        } else {
          const currentText: string[] | string[][] = [];

          const textLength = text.length;
          const lacksTop = Math.round((rectangle.height - textLength) * alignVertically);
          const lacksBottom = rectangle.height - textLength - lacksTop;

          const wholeSpaceWidth = " ".repeat(rectangle.width);
          for (let i = 0; i < lacksTop; ++i) {
            currentText[i] = wholeSpaceWidth;
          }

          for (let i = lacksTop + textLength; i < lacksTop + textLength + lacksBottom; ++i) {
            currentText[i] = wholeSpaceWidth;
          }

          for (let [i, line] of text.entries()) {
            if (overwriteRectangle) {
              line = cropToWidth(line, rectangle.width);
            }

            if (alignHorizontally === 0) {
              currentText[i + lacksTop] = line;
            } else {
              const lineWidth = textWidth(line);

              const lacksLeft = Math.round((rectangle.width - lineWidth) * alignHorizontally);
              const lacksRight = rectangle.width - lineWidth - lacksLeft;

              let alignedLine: string | string[] = " ".repeat(lacksLeft) + line + " ".repeat(lacksRight);
              if (multiCodePointSupport) {
                alignedLine = getMultiCodePointCharacters(alignedLine);
              }

              currentText[i + lacksTop] = alignedLine;
            }
          }

          this.#text = currentText;
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
