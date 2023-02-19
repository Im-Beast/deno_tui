import { Canvas } from "./canvas.ts";
import { DrawObject, DrawObjectOptions } from "./draw_object.ts";

import { textWidth } from "../utils/strings.ts";

import type { Rectangle } from "../types.ts";

export interface DrawTextOptions extends DrawObjectOptions<"text"> {
  value: string;
  rectangle: {
    column: number;
    row: number;
  };
}

export class TextObject extends DrawObject<"text"> {
  value: string;
  previousValue!: string;

  constructor(options: DrawTextOptions) {
    super("text", options);
    this.value = options.value;
    // This gets filled with width and height in `update()`
    this.rectangle = options.rectangle as Rectangle;
    this.update();
  }

  update(): void {
    super.update();

    const { value, previousValue } = this;
    if (value === previousValue) return;

    const { rectangle } = this;

    if (this.rendered) {
      for (let i = 0; i < value.length; ++i) {
        if (value[i] !== previousValue[i]) {
          this.queueRerender(rectangle.row, rectangle.column + i);
        }
      }

      if (value.length < previousValue.length) {
        for (let i = value.length; i < previousValue.length; ++i) {
          for (const objectUnder of this.objectsUnder) {
            objectUnder.queueRerender(rectangle.row, rectangle.column + i);
          }
        }
      }
    }

    rectangle.width = textWidth(value);
    rectangle.height = 1;
    this.previousValue = value;
  }

  render(canvas: Canvas): void {
    const { style, value, rectangle, omitCells } = this;
    const { columns, rows } = canvas.size;
    const { frameBuffer, rerenderQueue } = canvas;

    const { row, column: startColumn } = rectangle;
    if (row < 0 || row >= rows) return;

    const rowBuffer = frameBuffer[row];
    const omitColumns = omitCells[row];
    const rerenderQueueRow = rerenderQueue[row] ??= new Set();

    for (let c = 0; c < value.length; ++c) {
      const column = startColumn + c;

      if (column < 0) continue;
      else if (column >= columns) break;

      if (omitColumns?.has(column)) {
        continue;
      }

      rowBuffer[column] = style(value[c]);
      rerenderQueueRow.add(column);
    }

    omitColumns?.clear();
  }

  rerender(canvas: Canvas): void {
    const { style, value, rectangle, omitCells, rerenderCells } = this;
    const { columns, rows } = canvas.size;
    const { frameBuffer, rerenderQueue } = canvas;

    const { row } = rectangle;

    const rerenderColumns = rerenderCells[row];
    const omitColumns = omitCells[row];

    if (row < 0 || row >= rows) return;

    const rowBuffer = frameBuffer[row];
    const rerenderQueueRow = rerenderQueue[row] ??= new Set();

    for (const column of rerenderColumns) {
      if (
        column < 0 || column >= columns ||
        column < rectangle.column || column >= rectangle.column + rectangle.width ||
        omitColumns?.has(column)
      ) {
        continue;
      }

      rowBuffer[column] = style(value[column - rectangle.column]);
      rerenderQueueRow.add(column);
    }

    rerenderColumns.clear();
    omitColumns?.clear();
  }
}
