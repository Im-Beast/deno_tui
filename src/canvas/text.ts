import { DrawObject, DrawObjectOptions } from "./draw_object.ts";

import { textWidth, UNICODE_CHAR_REGEXP } from "../utils/strings.ts";
import { Dynamic, PossibleDynamic, setPossibleDynamicProperty } from "../utils/dynamic.ts";
import { fitsInRectangle, rectangleEquals, rectangleIntersection } from "../utils/numbers.ts";

export interface TextObjectOptions extends DrawObjectOptions {
  value: PossibleDynamic<string>;
  overwriteWidth?: PossibleDynamic<boolean>;
  multiCodePointSupport?: PossibleDynamic<boolean>;
  rectangle: PossibleDynamic<{ column: number; row: number }>;
}

export class TextObject extends DrawObject<"text"> {
  value!: string;
  valueChars: string[];
  previousValue!: string;
  overwriteWidth!: boolean;
  previousValueChars!: string[];
  multiCodePointSupport!: boolean;

  dynamicValue?: Dynamic<string>;
  dynamicOverwriteWidth?: Dynamic<boolean>;
  dynamicMultiCodePointSupport?: Dynamic<boolean>;

  constructor(options: TextObjectOptions) {
    super("text", options);

    setPossibleDynamicProperty(this, "overwriteWidth", options.overwriteWidth ?? false);
    setPossibleDynamicProperty(this, "multiCodePointSupport", options.multiCodePointSupport ?? false);
    setPossibleDynamicProperty(this, "value", options.value);
    setPossibleDynamicProperty(this, "rectangle", options.rectangle);
    this.rectangle.height = 1;
    if (!this.overwriteWidth) {
      this.rectangle.width = textWidth(this.value);
    }

    this.valueChars = this.multiCodePointSupport ? this.value.match(UNICODE_CHAR_REGEXP) ?? [] : this.value.split("");
  }

  updateMovement(): void {
    const { rectangle, previousRectangle, objectsUnder } = this;

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

  update(): void {
    if (this.dynamicValue) this.value = this.dynamicValue();
    if (this.dynamicOverwriteWidth) this.overwriteWidth = this.dynamicOverwriteWidth();
    if (this.dynamicMultiCodePointSupport) this.multiCodePointSupport = this.dynamicMultiCodePointSupport();

    const { value, previousValue } = this;
    if (value === previousValue) {
      super.update();
      return;
    }

    const { rectangle, valueChars: oldValueChars } = this;
    if (!this.overwriteWidth) {
      rectangle.width = textWidth(value);
    }
    rectangle.height = 1;
    super.update();

    const valueChars = this.valueChars = this.multiCodePointSupport
      ? this.value.match(UNICODE_CHAR_REGEXP) ?? []
      : this.value.split("");

    const { row, column } = this.rectangle;
    if (valueChars.length) {
      for (let c = 0; c < valueChars.length; ++c) {
        this.queueRerender(row, column + c);
      }
    } else {
      for (const objectUnder of this.objectsUnder) {
        for (let c = 0; c < oldValueChars.length; ++c) {
          objectUnder.queueRerender(row, column + c);
        }
      }
    }

    this.previousValue = value;
    this.previousValueChars = oldValueChars;
  }

  rerender(): void {
    const { canvas, style, valueChars, rectangle, omitCells, rerenderCells } = this;

    const { frameBuffer, rerenderQueue } = canvas;
    const { columns, rows } = canvas.size;

    const { row } = rectangle;
    let rowRange = Math.min(row, rows);
    let columnRange = Math.min(rectangle.column + rectangle.width, columns);

    const viewRectangle = this.view?.rectangle;
    if (viewRectangle) {
      rowRange = Math.min(row, viewRectangle.row + viewRectangle.height);
      columnRange = Math.min(columnRange, viewRectangle.column + viewRectangle.width);
    }

    if (row > rowRange) return;

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
    omitColumns?.clear();
  }
}
