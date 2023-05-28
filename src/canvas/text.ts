// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { DrawObject, DrawObjectOptions } from "./draw_object.ts";

import { textWidth, UNICODE_CHAR_REGEXP } from "../utils/strings.ts";
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";
import { BaseSignal, Effect } from "../signals.ts";
import { Rectangle } from "../types.ts";
import { signalify } from "../utils/signals.ts";

export type TextRectangle = { column: number; row: number; width?: number };

export interface TextObjectOptions extends DrawObjectOptions {
  value: string | BaseSignal<string>;
  overwriteRectangle?: boolean | BaseSignal<boolean>;
  rectangle: TextRectangle | BaseSignal<TextRectangle>;
  multiCodePointSupport?: boolean | BaseSignal<boolean>;
}

export class TextObject extends DrawObject<"text"> {
  text: BaseSignal<string>;
  valueChars: string[] | string;
  overwriteRectangle: BaseSignal<boolean>;
  multiCodePointSupport: BaseSignal<boolean>;

  constructor(options: TextObjectOptions) {
    super("text", options);

    this.text = signalify(options.value);
    this.rectangle = signalify(options.rectangle) as BaseSignal<Rectangle>;
    this.overwriteRectangle = signalify(options.overwriteRectangle ?? false);
    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);
    this.valueChars = this.multiCodePointSupport.value
      ? this.text.value.match(UNICODE_CHAR_REGEXP) ?? ""
      : this.text.value;

    new Effect(() => {
      const _style = this.style.value;
      const text = this.text.value;
      const rectangle = this.rectangle.value;
      const multiCodePointSupport = this.multiCodePointSupport.value;
      const overwriteRectangle = this.overwriteRectangle.value;

      this.needsToUpdateIntersections = true;
      for (const objectUnder of this.objectsUnder) {
        objectUnder.needsToUpdateIntersections = true;
      }

      if (!overwriteRectangle) {
        rectangle.width = textWidth(text);
        rectangle.height = 1;
      }

      const { valueChars: previousValueChars } = this;
      const valueChars: string | string[] = this.valueChars = multiCodePointSupport
        ? text.match(UNICODE_CHAR_REGEXP) ?? []
        : text;

      const { row, column, width } = rectangle;
      const barrier = overwriteRectangle
        ? (width < previousValueChars.length ? width : -1)
        : (valueChars.length < previousValueChars.length ? valueChars.length : -1);

      for (let c = 0; c < Math.max(valueChars.length, previousValueChars.length); ++c) {
        if (barrier !== -1 && c >= barrier) {
          for (const objectUnder of this.objectsUnder) {
            objectUnder.queueRerender(row, column + c);
          }
        } else if (valueChars[c] !== previousValueChars[c]) {
          this.queueRerender(row, column + c);
        }
      }
    });
  }

  updateMovement(): void {
    const { objectsUnder, previousRectangle } = this;
    const rectangle = this.rectangle.peek();

    // Rerender cells that changed because objects position changed
    if (!previousRectangle || rectangleEquals(rectangle, previousRectangle)) return;

    const intersection = rectangleIntersection(rectangle, previousRectangle, true);

    const previousRow = previousRectangle.row;
    const previousColumnRange = previousRectangle.column + previousRectangle.width;
    for (let column = previousRectangle.column; column < previousColumnRange; ++column) {
      if (intersection && fitsInRectangle(column, previousRow, intersection)) {
        continue;
      }

      for (const objectUnder of objectsUnder) {
        objectUnder.queueRerender(previousRow, column);
      }
    }

    const hasOriginMoved = rectangle.column !== previousRectangle.column || rectangle.row !== previousRectangle.row;

    const { row } = rectangle;
    const columnRange = rectangle.column + rectangle.width;
    for (let column = rectangle.column; column < columnRange; ++column) {
      // When text moves it needs to be rerendered completely because of text continuity
      if (hasOriginMoved) this.queueRerender(row, column);

      if (intersection && fitsInRectangle(column, row, intersection)) {
        continue;
      }

      for (const objectUnder of objectsUnder) {
        objectUnder.queueRerender(row, column);
      }
    }
  }

  rerender(): void {
    const { canvas, valueChars, omitCells, rerenderCells } = this;

    const { frameBuffer, rerenderQueue } = canvas;
    const { columns, rows } = canvas.size.peek();

    const rectangle = this.rectangle.peek();
    const style = this.style.peek();

    const { row } = rectangle;

    let rowRange = Math.min(row, rows);
    let columnRange = Math.min(rectangle.column + valueChars.length, columns);

    const viewRectangle = this.view.peek()?.rectangle;
    if (viewRectangle) {
      rowRange = Math.min(row, viewRectangle.row + viewRectangle.height);
      columnRange = Math.min(columnRange, viewRectangle.column + viewRectangle.width);
    }

    if (row > rowRange) return;

    const rerenderColumns = rerenderCells[row];
    if (!rerenderColumns) return;

    const omitColumns = omitCells[row];
    if (omitColumns?.size === valueChars.length) {
      return;
    }

    const rowBuffer = frameBuffer[row] ??= [];

    const rerenderQueueRow = rerenderQueue[row] ??= new Set();

    for (const column of rerenderColumns) {
      if (
        column >= columnRange ||
        column < rectangle.column ||
        omitColumns?.has(column)
      ) {
        continue;
      }

      rowBuffer[column] = style(valueChars[column - rectangle.column]);
      rerenderQueueRow.add(column);
    }

    rerenderColumns.clear();
  }
}
