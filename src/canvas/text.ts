// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { DrawObject, DrawObjectOptions } from "./draw_object.ts";

import { textWidth, UNICODE_CHAR_REGEXP } from "../utils/strings.ts";
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";
import { Effect, Signal, SignalOfObject } from "../signals/mod.ts";
import { Rectangle } from "../types.ts";
import { signalify } from "../utils/signals.ts";
import { Subscription } from "../signals/types.ts";

/**
 * Type that describes position and size of TextObject
 *
 * When `width` isn't set, it gets automatically calculated depending of given `value` text width
 */
export type TextRectangle = { column: number; row: number; width?: number };

export interface TextObjectOptions extends DrawObjectOptions {
  value: string | Signal<string>;
  overwriteRectangle?: boolean | Signal<boolean>;
  rectangle: TextRectangle | SignalOfObject<TextRectangle>;
  multiCodePointSupport?: boolean | Signal<boolean>;
}

/**
 * DrawObject that's responsible for rendering text.
 *
 * Keep in mind its not designed to render mutliline text!
 */
export class TextObject extends DrawObject<"text"> {
  text: Signal<string>;
  valueChars: string[] | string;
  overwriteRectangle: Signal<boolean>;
  multiCodePointSupport: Signal<boolean>;

  #rectangleSubscription: Subscription<Rectangle>;
  #updateEffect: Effect;

  constructor(options: TextObjectOptions) {
    super("text", options);

    this.text = signalify(options.value);
    this.rectangle = signalify(options.rectangle as Rectangle);
    this.overwriteRectangle = signalify(options.overwriteRectangle ?? false);
    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);
    this.valueChars = this.multiCodePointSupport.value
      ? this.text.value.match(UNICODE_CHAR_REGEXP) ?? ""
      : this.text.value;

    const { updateObjects } = this.canvas;

    const update = (
      text: string,
      rectangle: Rectangle,
      multiCodePointSupport: boolean,
      overwriteRectangle: boolean,
    ): void => {
      if (!overwriteRectangle) {
        const lastWidth = rectangle.width;
        rectangle.width = textWidth(text);

        if (rectangle.width !== lastWidth) {
          this.moved = true;
          for (const objectUnder of this.objectsUnder) {
            objectUnder.moved = true;
          }
        }

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

      const columnRange = Math.max(valueChars.length, previousValueChars.length);

      if (barrier !== -1) {
        for (let c = 0; c < columnRange; ++c) {
          if (c >= barrier) {
            for (const objectUnder of this.objectsUnder) {
              objectUnder.queueRerender(row, column + c);
            }
          } else if (valueChars[c] !== previousValueChars[c]) {
            this.queueRerender(row, column + c);
          }
        }
      } else {
        for (let c = 0; c < columnRange; ++c) {
          if (valueChars[c] !== previousValueChars[c]) {
            this.queueRerender(row, column + c);
          }
        }
      }
    };

    this.#rectangleSubscription = (rectangle) => {
      const text = this.text.peek();
      const multiCodePointSupport = this.multiCodePointSupport.peek();
      const overwriteRectangle = this.overwriteRectangle.peek();

      this.moved = true;
      for (const objectUnder of this.objectsUnder) {
        objectUnder.moved = true;
      }

      update(text, rectangle, multiCodePointSupport, overwriteRectangle);
    };

    this.#updateEffect = new Effect(() => {
      const text = this.text.value;
      const rectangle = this.rectangle.peek();
      const overwriteRectangle = this.overwriteRectangle.value;
      const multiCodePointSupport = this.multiCodePointSupport.value;

      this.updated = false;
      updateObjects.push(this);

      for (const objectUnder of this.objectsUnder) {
        objectUnder.updated = false;
        updateObjects.push(objectUnder);
      }

      update(text, rectangle, multiCodePointSupport, overwriteRectangle);
    });
  }

  draw(): void {
    this.#updateEffect.resume();
    this.rectangle.subscribe(this.#rectangleSubscription);
    super.draw();
  }

  erase(): void {
    this.#updateEffect.pause();
    this.rectangle.unsubscribe(this.#rectangleSubscription);
    super.erase();
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
