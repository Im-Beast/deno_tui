// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Component, ComponentOptions } from "../component.ts";

import type { EventRecord } from "../event_emitter.ts";
import { hierarchizeTheme, replaceEmptyStyle, Theme } from "../theme.ts";

import { DeepPartial, Rectangle } from "../types.ts";
import { clamp } from "../utils/numbers.ts";
import { textWidth } from "../utils/strings.ts";

export const sharpTableFramePieces = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  leftHorizontal: "├",
  rightHorizontal: "┤",
  horizontal: "─",
  vertical: "│",
} as const;

export const roundedTableFramePieces = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  leftHorizontal: "├",
  rightHorizontal: "┤",
  horizontal: "─",
  vertical: "│",
  topHorizontal: "┬",
  bottomHorizontal: "┴",
  cross: "┼",
} as const;

/** Type that specifies structore of object that defines how table frame looks like  */
export type TableFramePieceType = {
  [key in keyof typeof sharpTableFramePieces]: string;
};

/** Theme used by {TableComponent} to style itself */
export interface TableTheme extends Theme {
  /** Style for table headers */
  header: Theme;
  /** Style for currently selected row */
  selectedRow: Theme;
  /** Style for frame surrounding table */
  frame: Theme;
}

/** Object that determines text & width of a column in {TableComponent}'s headers */
export interface TableHeader {
  /** Text displayed above column */
  title: string;
  /** Enforced width of a column */
  width: number;
}

/** Interface defining object that {TableComponent}'s constructor can interpret */
export interface TableComponentOptions extends Omit<ComponentOptions, "rectangle"> {
  theme: DeepPartial<TableTheme>;
  /**
   *  Headers detailing size & text displayed for each data column
   *  When string is used width is determined by maximal width of either text or data in column
   */
  headers: (TableHeader | string)[];
  /** Data displayed by table */
  data: string[][];
  /**
   *  Position and size of component
   *  {TableComponent}'s rectangle doesn't include `width` property as width is defined by headers and table data
   */
  rectangle: Omit<Rectangle, "width">;
  /** Option that changes characters that surround {TableComponent} */
  framePieces?: "sharp" | "rounded" | TableFramePieceType;
}

/** Implementation for {TableComponent} class */
export type TableComponentImplementation = Omit<TableComponentOptions, "rectangle"> & {
  rectangle: Rectangle;
};

/** Component that can be pressed */
export class TableComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends Component<EventMap> implements TableComponentImplementation {
  declare theme: TableTheme;

  #lastInteraction = 0;
  #lastSelectedRow = 0;
  #rectangle: Rectangle;

  rowOffset: number;
  headers: TableHeader[];
  data: string[][];
  selectedRow: number;
  framePieces: "sharp" | "rounded" | TableFramePieceType;

  constructor(options: TableComponentOptions) {
    super(options as unknown as ComponentOptions);

    this.theme.frame = hierarchizeTheme(options.theme.frame ?? {});
    this.theme.selectedRow = hierarchizeTheme(options.theme.selectedRow ?? {});
    this.theme.header = hierarchizeTheme(options.theme.header ?? {});

    this.framePieces = options.framePieces ?? "sharp";
    this.rowOffset = 0;
    this.selectedRow = 0;
    this.data = options.data;
    this.headers = options.headers.map((header, i) => {
      let title = "";
      let width = 0;

      if (typeof header === "object") {
        title = header.title;
        width = header.width;
      } else {
        title = header;
      }

      return {
        title,
        width: width || Math.max(
          textWidth(title),
          this.data.reduce((a, b) => Math.max(a, textWidth(b[i])), 0),
        ),
      };
    });

    const { column, row, height } = options.rectangle;

    this.#rectangle = {
      column,
      row,
      width: -1,
      height,
    };

    this.on("keyPress", ({ key, ctrl, meta, shift }) => {
      if (ctrl || meta || shift) return;

      const lastDataRow = this.data.length - 1;

      switch (key) {
        case "up":
          --this.selectedRow;
          break;
        case "down":
          ++this.selectedRow;
          break;
        case "pageup":
          this.selectedRow -= ~~(lastDataRow / 100);
          break;
        case "pagedown":
          this.selectedRow += ~~(lastDataRow / 100);
          break;
        case "home":
          this.selectedRow = 0;
          break;
        case "end":
          this.selectedRow = lastDataRow;
          break;
      }

      this.selectedRow = clamp(this.selectedRow, 0, lastDataRow);
      this.rowOffset = clamp(this.selectedRow - ~~((height - 4) / 2), 0, lastDataRow - height + 5);
    });

    this.on("mousePress", ({ scroll, y, shift }) => {
      const { row, height } = this.#rectangle;

      const lastDataRow = this.data.length - 1;

      if (scroll !== 0) {
        if (shift) scroll *= ~~(lastDataRow / 100);
        this.rowOffset = clamp(this.rowOffset + scroll, 0, lastDataRow - height + 5);
      } else if (y >= row + 3 && y <= row + height - 2) {
        const dataRow = y - row + this.rowOffset - 3;
        const clampedRow = clamp(dataRow, 0, lastDataRow);
        if (dataRow !== clampedRow) return;
        this.selectedRow = dataRow;
      }
    });
  }

  get rectangle(): Rectangle {
    return {
      ...this.#rectangle,
      width: this.headers.reduce(
        // + 1 because of spacing between each header
        (a, b) => a + b.width + 1,
        0,
        // + 1 because of frames  on each side
      ) + 1,
    };
  }

  set rectangle(rectangle) {
    this.#rectangle = rectangle;
  }

  draw(): void {
    const { style, theme, state, data, headers, framePieces } = this;
    const frameStyle = replaceEmptyStyle(theme.frame[state], style);
    const headerStyle = replaceEmptyStyle(theme.header[state], style);
    const selectedRowStyle = replaceEmptyStyle(theme.selectedRow[state], style);

    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    canvas.draw(column, row, style((" ".repeat(width) + "\n").repeat(height)));

    // Drawing header cells
    {
      let colOffset = 0;
      for (const header of headers) {
        canvas.draw(column + colOffset + 1, row + 1, headerStyle(header.title));
        colOffset += header.width + 1;
      }
    }

    // Drawing data cells
    {
      let colOffset = 0;
      const lastRow = row + height - 1;
      const lastColumn = column + width - 1;
      for (const [r, rowData] of data.entries()) {
        if (r < this.rowOffset) continue;
        const drawRow = row + r + 3 - this.rowOffset;
        if (drawRow >= lastRow) break;

        const isSelected = r === this.selectedRow;
        const rowStyle = isSelected ? selectedRowStyle : style;
        if (isSelected) {
          canvas.draw(column, drawRow, rowStyle(" ".repeat(width)));
        }

        colOffset = 0;

        for (const [c, colData] of rowData.entries()) {
          const drawColumn = column + colOffset + 1;
          if (drawColumn >= lastColumn) continue;

          const headerWidth = headers[c].width;

          canvas.draw(drawColumn, drawRow, rowStyle(colData), {
            column: drawColumn,
            row: drawRow,
            width: Math.min(
              lastColumn - drawColumn - 1,
              headerWidth - 1,
            ),
            height: 1,
          });
          colOffset += headerWidth + 1;
        }
      }
    }

    // Render frame
    const pieces = framePieces === "sharp"
      ? sharpTableFramePieces
      : framePieces === "rounded"
      ? roundedTableFramePieces
      : framePieces;

    canvas.draw(column, row, frameStyle(pieces.topLeft));
    canvas.draw(column + width - 1, row, frameStyle(pieces.topRight));

    for (let y = row + 1; y < row + height - 1; ++y) {
      canvas.draw(column, y, frameStyle(pieces.vertical));
      canvas.draw(column + width - 1, y, frameStyle(pieces.vertical));
    }

    canvas.draw(column, row + 2, frameStyle(pieces.leftHorizontal));
    canvas.draw(column + width - 1, row + 2, frameStyle(pieces.rightHorizontal));

    for (let x = column + 1; x < column + width - 1; ++x) {
      canvas.draw(x, row, frameStyle(pieces.horizontal));
      canvas.draw(x, row + 2, frameStyle(pieces.horizontal));
      canvas.draw(x, row + height - 1, frameStyle(pieces.horizontal));
    }

    canvas.draw(column, row + height - 1, frameStyle(pieces.bottomLeft));
    canvas.draw(column + width - 1, row + height - 1, frameStyle(pieces.bottomRight));
  }

  interact(method?: "mouse" | "keyboard"): void {
    const now = Date.now();
    const interactionDelay = now - this.#lastInteraction;

    this.state = this.state === "focused" &&
        ((this.selectedRow == this.#lastSelectedRow && interactionDelay < 500) || method === "keyboard")
      ? "active"
      : "focused";

    this.#lastInteraction = now;
    this.#lastSelectedRow = this.selectedRow;
  }
}
