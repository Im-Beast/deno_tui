import { DrawObject, DrawObjectOptions } from "./draw_object.ts";

import { textWidth, UNICODE_CHAR_REGEXP } from "../utils/strings.ts";
import { Dynamic, isDynamic, PossibleDynamic } from "../utils/dynamic.ts";
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";

import type { Rectangle } from "../types.ts";

export interface TextObjectOptions extends DrawObjectOptions {
  value: PossibleDynamic<string>;
  overwriteWidth?: PossibleDynamic<boolean>;
  multiCodePointSupport?: PossibleDynamic<boolean>;
  rectangle: PossibleDynamic<{ column: number; row: number }>;
}

export class TextObject extends DrawObject<"text"> {
  value: string;
  valueChars: string[];
  previousValue!: string;
  overwriteWidth?: boolean;
  previousValueChars!: string[];
  multiCodePointSupport: boolean;

  dynamicValue?: Dynamic<string>;
  dynamicOverwriteWidth?: Dynamic<boolean>;
  dynamicMultiCodePointSupport?: Dynamic<boolean>;

  constructor(options: TextObjectOptions) {
    super("text", options);
    if (isDynamic(options.overwriteWidth)) {
      this.overwriteWidth = options.overwriteWidth();
      this.dynamicOverwriteWidth = options.overwriteWidth;
    } else {
      this.overwriteWidth = options.overwriteWidth ?? false;
    }

    if (isDynamic(options.multiCodePointSupport)) {
      this.multiCodePointSupport = options.multiCodePointSupport();
      this.dynamicMultiCodePointSupport = options.multiCodePointSupport;
    } else {
      this.multiCodePointSupport = options.multiCodePointSupport ?? false;
    }

    if (isDynamic(options.value)) {
      this.value = options.value();
      this.dynamicValue = options.value;
    } else {
      this.value = options.value;
    }

    this.valueChars = this.multiCodePointSupport ? this.value.match(UNICODE_CHAR_REGEXP) ?? [] : this.value.split("");

    if (isDynamic(options.rectangle)) {
      this.rectangle = options.rectangle() as Rectangle;
      this.dynamicRectangle = options.rectangle as Dynamic<Rectangle>;
    } else {
      this.rectangle = options.rectangle as Rectangle;
    }
    this.rectangle.height = 1;

    if (!this.overwriteWidth) this.rectangle.width = textWidth(this.value);
  }

  updateMovement(): void {
    const { rectangle, previousRectangle, objectsUnder } = this;

    // Rerender cells that changed because objects position changed
    if (!previousRectangle || rectangleEquals(rectangle, previousRectangle)) return;

    const intersection = rectangleIntersection(rectangle, previousRectangle, true);

    const previousRow = previousRectangle.row;
    for (let column = previousRectangle.column; column < previousRectangle.column + previousRectangle.width; ++column) {
      if (intersection && fitsInRectangle(column, previousRow, intersection)) {
        continue;
      }

      for (const objectUnder of objectsUnder) {
        objectUnder.queueRerender(previousRow, column);
      }
    }

    const hasOriginMoved = rectangle.column !== previousRectangle.column || rectangle.row !== previousRectangle.row;

    const row = rectangle.row;
    for (let column = rectangle.column; column < rectangle.column + rectangle.width; ++column) {
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

  update(): void {
    super.update();
    if (this.dynamicValue) this.value = this.dynamicValue();
    if (this.dynamicMultiCodePointSupport) this.multiCodePointSupport = this.dynamicMultiCodePointSupport();
    if (this.dynamicOverwriteWidth) this.overwriteWidth = this.dynamicOverwriteWidth();

    const { value, previousValue } = this;
    if (value === previousValue) return;

    const { rectangle, valueChars: oldValueChars } = this;

    const valueChars = this.valueChars = this.multiCodePointSupport
      ? this.value.match(UNICODE_CHAR_REGEXP) ?? []
      : this.value.split("");

    const { previousValueChars } = this;
    if (previousValueChars) {
      const { column, row } = rectangle;

      for (let i = 0; i < valueChars.length; ++i) {
        this.queueRerender(row, column + i);
      }
    }

    if (!this.overwriteWidth) {
      rectangle.width = textWidth(value);
    }
    rectangle.height = 1;

    this.previousValue = value;
    this.previousValueChars = oldValueChars;
  }

  render(): void {
    const { canvas, style, valueChars, rectangle, omitCells } = this;
    const { frameBuffer, rerenderQueue } = canvas;

    const { row, column: startColumn } = rectangle;
    const omitColumns = omitCells[row];

    if (omitColumns?.size === rectangle.width) {
      omitColumns?.clear();
      return;
    }

    const rowBuffer = frameBuffer[row];
    if (!rowBuffer) return;
    const rerenderQueueRow = rerenderQueue[row] ??= new Set();

    for (let c = 0; c < valueChars.length; ++c) {
      const column = startColumn + c;
      if (omitColumns?.has(column)) continue;

      rowBuffer[column] = style(valueChars[c]);
      rerenderQueueRow.add(column);
    }

    omitColumns?.clear();
  }

  rerender(): void {
    const { canvas, style, valueChars, rectangle, omitCells, rerenderCells } = this;
    const { frameBuffer, rerenderQueue } = canvas;

    const { row } = rectangle;

    const rerenderColumns = rerenderCells[row];
    if (!rerenderColumns) return;

    const omitColumns = omitCells[row];

    if (omitColumns?.size === rectangle.width) {
      omitColumns.clear();
      return;
    }

    const rowBuffer = frameBuffer[row];
    const rerenderQueueRow = rerenderQueue[row] ??= new Set();

    for (const column of rerenderColumns) {
      if (
        column >= rectangle.column + rectangle.width ||
        column < rectangle.column ||
        omitColumns?.has(column)
      ) {
        continue;
      }

      rowBuffer[column] = style(valueChars[column - rectangle.column]);
      rerenderQueueRow.add(column);
    }

    rerenderColumns.clear();
    omitColumns?.clear();
  }
}
