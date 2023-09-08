// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Painter, PainterOptions } from "../painter.ts";
import { Signal, SignalOfObject } from "../../signals/mod.ts";

import type { Rectangle } from "../../types.ts";
import { signalify } from "../../utils/signals.ts";
import { Dependency, Subscription } from "../../signals/types.ts";
import { Effect } from "../../signals/effect.ts";
import {
  cropToWidth,
  getMultiCodePointCharacters,
  textWidth,
  usesMultiCodePointCharacters,
} from "../../utils/strings.ts";
import { jinkReactiveObject, unjinkReactiveObject } from "../../signals/reactivity.ts";
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../../utils/numbers.ts";
import { Computed } from "../../signals/computed.ts";

export enum VerticalAlign {
  Top = 0,
  Middle = 0.5,
  Bottom = 1,
}

export enum HorizontalAlign {
  Left = 0,
  Center = 0.5,
  Right = 1,
}

export interface TextPainterOptions extends PainterOptions {
  text: string[] | Signal<string[]>;
  rectangle: Rectangle | SignalOfObject<Rectangle>;

  alignVertically?: number | Signal<number>;
  alignHorizontally?: number | Signal<number>;

  overwriteRectangle?: boolean | Signal<boolean>;
  multiCodePointSupport?: boolean | Signal<boolean>;
}

// FIXME: when text is rendered outside of visible canvas boundaries it overflows over starting columns

/**
 * DrawObject that's responsible for rendering rectangles (boxes).
 */
export class TextPainter extends Painter<"text"> {
  text: Signal<string[]>;

  alignVertically: Signal<number>;
  alignHorizontally: Signal<number>;

  overwriteRectangle: Signal<boolean>;
  multiCodePointSupport: Signal<boolean>;

  #rectangleSubscription: Subscription<Rectangle>;
  #textSubscription: Subscription<string[]>;
  #textUpdateEffect: Effect;

  #text?:
    // Text with `multiCodePointSupport` disabled
    | string[]
    // Text with `multiCodePointSupport` enabled
    | string[][];

  #columnStart: number;
  #columnRange: number;

  #rowStart: number;
  #rowRange: number;

  constructor(options: TextPainterOptions) {
    super("text", options);

    this.text = signalify(options.text);

    this.alignVertically = signalify(options.alignVertically ?? 0);
    this.alignHorizontally = signalify(options.alignHorizontally ?? 0);

    this.multiCodePointSupport = signalify(
      options.multiCodePointSupport ?? usesMultiCodePointCharacters(this.text.peek()),
    );
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

    const updateText = (text: string[]) => {
      const alignVertically = this.alignVertically.peek();
      const alignHorizontally = this.alignHorizontally.peek();

      const overwriteRectangle = this.overwriteRectangle.peek();
      const multiCodePointSupport = this.multiCodePointSupport.peek();

      const rectangle = this.rectangle.peek();
      const { column, row } = rectangle;
      let { width, height } = rectangle;

      const { objectsUnder } = this;

      const currentText = this.#text as string[] | string[][] | undefined;

      if (!overwriteRectangle) {
        jinkReactiveObject(rectangle);
        rectangle.height = height = text.length;
        rectangle.width = width = text.reduce((p, n) => {
          const w = textWidth(n);
          return p > w ? p : w;
        }, 0);
        unjinkReactiveObject(rectangle);
      }

      if (currentText) {
        const textLength = text.length;

        let lacksTop = 0;
        if (textLength !== height) {
          lacksTop = Math.round((height - textLength) * alignVertically);
          const lacksBottom = height - textLength - lacksTop;

          const wholeSpaceWidth = " ".repeat(width);
          for (let i = 0; i < lacksTop; ++i) {
            currentText[i] = wholeSpaceWidth;
          }

          for (let i = lacksTop + textLength; i < lacksTop + textLength + lacksBottom; ++i) {
            currentText[i] = wholeSpaceWidth;
          }
        }

        for (let [r, line] of text.entries()) {
          const actualLineRow = r + lacksTop;
          const currentLine = currentText[actualLineRow];

          if (overwriteRectangle) {
            line = cropToWidth(line, width);
          }

          if (line !== currentLine) {
            const maxLength = Math.max(line.length, currentLine.length);

            for (let c = 0; c < maxLength; ++c) {
              if (line[c] !== currentLine[c]) {
                for (const objectUnder of objectsUnder) {
                  objectUnder.queueRerender(row, column);
                }

                this.queueRerender(row + actualLineRow, column + c);
              }
            }
          }

          let alignedLine: string | string[];
          const lineWidth = textWidth(line);
          const lackingSpace = width - lineWidth;

          if (alignHorizontally === 0) {
            alignedLine = line + " ".repeat(lackingSpace);
          } else {
            const lacksLeft = Math.round(lackingSpace * alignHorizontally);
            const lacksRight = lackingSpace - lacksLeft;

            alignedLine = " ".repeat(lacksLeft) + line + " ".repeat(lacksRight);
          }

          if (multiCodePointSupport) {
            alignedLine = getMultiCodePointCharacters(alignedLine);
          }

          if (Array.isArray(alignedLine)) {
            for (let i = 0; i < alignedLine.length; ++i) {
              const char = alignedLine[i];
              const charWidth = textWidth(char);

              for (let j = 1; j < charWidth; ++j) {
                alignedLine.splice(++i, 0, "");
              }
            }
          }

          currentText[actualLineRow] = alignedLine as string;
        }

        while (currentText.length > height) {
          currentText.pop();
        }
      } else {
        const currentText: string[] | string[][] = [];

        const textLength = text.length;
        const lacksTop = Math.round((height - textLength) * alignVertically);
        const lacksBottom = height - textLength - lacksTop;

        const wholeSpaceWidth = " ".repeat(width);
        for (let i = 0; i < lacksTop; ++i) {
          currentText[i] = wholeSpaceWidth;
        }

        for (let i = lacksTop + textLength; i < lacksTop + textLength + lacksBottom; ++i) {
          currentText[i] = wholeSpaceWidth;
        }

        for (let [i, line] of text.entries()) {
          if (overwriteRectangle) {
            line = cropToWidth(line, width);
          }

          const lineWidth = textWidth(line);
          const lackingSpace = width - lineWidth;

          let alignedLine: string | string[];

          if (alignHorizontally === 0) {
            alignedLine = line + " ".repeat(lackingSpace);
          } else {
            const lacksLeft = Math.round(lackingSpace * alignHorizontally);
            const lacksRight = lackingSpace - lacksLeft;

            alignedLine = " ".repeat(lacksLeft) + line + " ".repeat(lacksRight);
          }

          if (multiCodePointSupport) {
            alignedLine = getMultiCodePointCharacters(alignedLine);
          }

          if (Array.isArray(alignedLine)) {
            for (let i = 0; i < alignedLine.length; ++i) {
              const char = alignedLine[i];
              const charWidth = textWidth(char);

              for (let j = 1; j < charWidth; ++j) {
                alignedLine.splice(++i, 0, "");
              }
            }
          }

          currentText[i + lacksTop] = alignedLine;
        }

        this.#text = currentText;
      }
    };

    this.#textSubscription = updateText;
    this.#textSubscription(this.text.peek());

    this.#columnStart = 0;
    this.#columnRange = 0;
    this.#rowStart = 0;
    this.#rowRange = 0;

    this.#textUpdateEffect = new Effect((cause) => {
      const textSignal = this.text;
      const _text = textSignal.value;
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

      if (
        // When it moved
        this.#rowStart !== rowStart || this.#rowRange !== rowRange ||
        this.#columnStart !== columnStart || this.#columnRange !== columnRange ||
        // When text signal caused the change
        cause === textSignal ||
        // When any of text signal dependencies caused the change
        (textSignal instanceof Computed && textSignal.dependencies.has(cause as Dependency))
      ) {
        this.moved = true;
        this.updated = false;
        updateObjects.push(this);

        for (const objectUnder of this.objectsUnder) {
          objectUnder.moved = true;
          objectUnder.updated = false;
          updateObjects.push(objectUnder);
        }

        this.#rowStart = rowStart;
        this.#rowRange = rowRange;

        this.#columnStart = columnStart;
        this.#columnRange = columnRange;
      }
    });
  }

  draw(): void {
    this.rectangle.subscribe(this.#rectangleSubscription);
    this.text.subscribe(this.#textSubscription);
    this.#textUpdateEffect.resume();
    this.#textSubscription(this.text.peek());
    super.draw();
  }

  erase(): void {
    this.rectangle.unsubscribe(this.#rectangleSubscription);
    this.text.unsubscribe(this.#textSubscription);
    this.#textUpdateEffect.pause();
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
    const text = this.#text;
    if (!text) return;

    const { canvas, rerenderCells, omitCells, painted } = this;

    const rectangle = this.rectangle.peek();
    const style = this.style.peek();

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

          canvas.draw(row, column, style(line[column - columnStart]));
        }

        rerenderColumns.clear();
      } else {
        for (let column = columnStart; column < columnRange; ++column) {
          if (omitColumns?.has(column)) {
            continue;
          }

          canvas.draw(row, column, style(line[column - columnStart]));
        }
      }
    }

    this.painted = true;
  }
}
