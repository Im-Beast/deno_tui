import { Canvas, compareOmitCellRange, DrawObject, DrawObjectOptions, pushToPointedArray } from "./canvas.ts";

import { textWidth } from "../utils/strings.ts";

export interface DrawTextObject extends DrawObject<"text"> {
  value: string;
  valueLines: string[];
  previousValue: string;
}

export interface DrawTextOptions extends DrawObjectOptions<"text"> {
  value: string;
}

export class TextObject extends DrawObject<"text"> {
  value: string;
  valueLines!: string[];
  previousValue!: string;

  constructor(options: DrawTextOptions) {
    super("text", options);
    this.value = options.value;
    this.updateRectangle();
  }

  updateRectangle() {
    if (this.value === this.previousValue) return;

    const valueLines = this.valueLines = this.value.split("\n");

    let maxWidth = 0;
    for (let i = 0; i < valueLines.length; ++i) {
      maxWidth = Math.max(maxWidth, textWidth(valueLines[i]));
    }

    this.rectangle.width = maxWidth;
    this.rectangle.height = valueLines.length;

    this.previousValue = this.value;
  }

  render(canvas: Canvas): void {
    const { style, valueLines, rectangle, omitCells, omitCellsPointer } = this;
    const { columns, rows } = canvas.size;
    const { frameBuffer, rerenderQueue } = canvas;

    for (let i = 0; i < valueLines.length; ++i) {
      const line = valueLines[i];

      const row = rectangle.row + i;
      if (row < 0) continue;
      else if (row >= rows) break;

      const rowBuffer = frameBuffer[row];

      for (let c = 0; c < line.length; ++c) {
        const column = rectangle.column + c;

        if (column < 0) continue;
        else if (column >= columns) break;

        if (compareOmitCellRange(row, column, omitCells, omitCellsPointer)) {
          continue;
        }

        rowBuffer[column] = style(line[c]);
        pushToPointedArray(rerenderQueue, canvas.rerenderQueuePointer++, row, column);
      }
    }
  }

  rerender(canvas: Canvas): void {
    // TODO: Partial rendering
    this.render(canvas);
  }
}
