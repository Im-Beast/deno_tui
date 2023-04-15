import { Component, ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";
import { TextObject } from "../canvas/text.ts";

import type { DeepPartial, Rectangle } from "../types.ts";
import { Theme } from "../theme.ts";
import { textWidth } from "../utils/strings.ts";
import { clamp } from "../utils/numbers.ts";

export const TableUnicodeCharacters = {
  sharp: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    leftHorizontal: "├",
    rightHorizontal: "┤",
    horizontal: "─",
    vertical: "│",
  },
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    leftHorizontal: "├",
    rightHorizontal: "┤",
    horizontal: "─",
    vertical: "│",
  },
};

export type TableUnicodeCharactersType = {
  [key in keyof typeof TableUnicodeCharacters["rounded"]]: string;
};

export interface TableTheme extends Theme {
  frame: Theme;
  header: Theme;
  selectedRow: Theme;
}

export type TableHeader<WidthDefined extends boolean> = {
  title: string;
} & (WidthDefined extends true ? { width: number } : { width?: number });

export interface TableOptions extends Omit<ComponentOptions, "rectangle"> {
  theme: DeepPartial<TableTheme, "frame" | "header" | "selectedRow">;
  headers: TableHeader<false>[];
  rectangle: Omit<Rectangle, "width">;
  data: string[][];
  charMap: keyof typeof TableUnicodeCharacters | TableUnicodeCharactersType;
}

export class Table extends Component {
  declare theme: TableTheme;
  declare drawnObjects: {
    frame: [
      top: TextObject,
      bottom: TextObject,
      spacer: TextObject,
      left: BoxObject,
      right: BoxObject,
    ];

    headers: TextObject[];
    data: TextObject[];
  };

  data: string[][];
  headers: TableHeader<true>[];
  charMap: TableUnicodeCharactersType;
  selectedRow: number;
  offsetRow: number;

  constructor(options: TableOptions) {
    super(options as unknown as ComponentOptions);

    this.data = options.data;
    this.charMap = typeof options.charMap === "string" ? TableUnicodeCharacters[options.charMap] : options.charMap;
    this.headers = options.headers.map((header, i) => {
      if (!header.width) {
        header.width = Math.max(
          textWidth(header.title),
          this.data.reduce((a, b) => Math.max(a, textWidth(b[i])), 0),
        );
      }
      return header as TableHeader<true>;
    });

    this.selectedRow = 0;
    this.offsetRow = 0;

    this.on("keyPress", ({ key, ctrl, meta, shift }) => {
      if (ctrl || meta || shift) return;

      const { height } = this.rectangle;
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

      this.selectedRow = clamp(this.selectedRow, 0, lastDataRow - 1);
      this.offsetRow = clamp(this.selectedRow - ~~((height - 4) / 2), 0, lastDataRow - height + 5);
    });

    this.on("mousePress", ({ ctrl, meta, shift, scroll, y }) => {
      if (ctrl || meta || shift) return;
      const { row, height } = this.rectangle;

      const lastDataRow = this.data.length - 1;

      if (scroll !== 0) {
        this.offsetRow = clamp(this.offsetRow + scroll, 0, lastDataRow - height + 5);
      } else if (y >= row + 3 && y <= row + height - 2) {
        const dataRow = y - row + this.offsetRow - 3;
        if (dataRow !== clamp(dataRow, 0, lastDataRow)) return;
        this.selectedRow = dataRow;
      }
    });
  }

  update(): void {
    super.update();

    this.rectangle.width = this.headers.reduce((a, b) => a + b.width + 1, 0) + 1;

    const { data, headers, drawnObjects } = this;

    if (headers.length > drawnObjects.headers.length) {
      this.#fillHeaderDrawObjects();
    } else if (headers.length < drawnObjects.headers.length) {
      this.#popUnusedHeaderDrawObjects();
    }

    if (data.length > drawnObjects.data.length) {
      this.#fillDataDrawObjects();
    } else if (data.length < drawnObjects.data.length) {
      this.#popUnusedDataDrawObjects();
    }
  }

  draw(): void {
    super.draw();

    const { canvas } = this.tui;
    const { drawnObjects } = this;

    // Drawing header cells
    drawnObjects.headers = [];
    this.#fillHeaderDrawObjects();

    // Drawing data cells
    drawnObjects.data = [];
    this.#fillDataDrawObjects();

    // Drawing frame
    const topRectangle = { column: 0, row: 0 };
    const top = new TextObject({
      canvas,
      view: () => this.view,
      zIndex: () => this.zIndex,
      style: () => this.theme.frame[this.state],
      rectangle: () => {
        const { column, row } = this.rectangle;
        topRectangle.column = column;
        topRectangle.row = row;
        return topRectangle;
      },
      value: () => {
        const { topLeft, horizontal, topRight } = this.charMap;
        return topLeft + horizontal.repeat(this.rectangle.width - 2) + topRight;
      },
    });
    top.draw();

    const bottomRectangle = { column: 0, row: 0 };
    const bottom = new TextObject({
      canvas,
      view: () => this.view,
      zIndex: () => this.zIndex,
      style: () => this.theme.frame[this.state],
      rectangle: () => {
        const { column, row, height } = this.rectangle;
        bottomRectangle.column = column;
        bottomRectangle.row = row + height - 1;
        return bottomRectangle;
      },
      value: () => {
        const { bottomLeft, horizontal, bottomRight } = this.charMap;
        return bottomLeft + horizontal.repeat(this.rectangle.width - 2) + bottomRight;
      },
    });
    bottom.draw();

    const leftRectangle = { column: 0, row: 0, width: 1, height: 0 };
    const left = new BoxObject({
      canvas,
      view: () => this.view,
      zIndex: () => this.zIndex,
      style: () => this.theme.frame[this.state],
      filler: () => this.charMap.vertical,
      rectangle: () => {
        const { column, row, height } = this.rectangle;
        leftRectangle.column = column;
        leftRectangle.row = row + 1;
        leftRectangle.height = height - 2;
        return leftRectangle;
      },
    });
    left.draw();

    const rightRectangle = { column: 0, row: 0, width: 1, height: 0 };
    const right = new BoxObject({
      canvas,
      view: () => this.view,
      zIndex: () => this.zIndex,
      style: () => this.theme.frame[this.state],
      filler: () => this.charMap.vertical,
      rectangle: () => {
        const { column, row, width, height } = this.rectangle;
        rightRectangle.column = column + width - 1;
        rightRectangle.row = row + 1;
        rightRectangle.height = height - 2;
        return rightRectangle;
      },
    });
    right.draw();

    const middleRectangle = { column: 0, row: 0 };
    const spacer = new TextObject({
      canvas,
      zIndex: () => this.zIndex,
      style: () => this.theme.frame[this.state],
      rectangle: () => {
        const { column, row } = this.rectangle;
        middleRectangle.column = column;
        middleRectangle.row = row + 2;
        return middleRectangle;
      },
      value: () => {
        const { leftHorizontal, horizontal, rightHorizontal } = this.charMap;
        return leftHorizontal + horizontal.repeat(this.rectangle.width - 2) + rightHorizontal;
      },
    });
    spacer.draw();

    drawnObjects.frame = [top, bottom, spacer, left, right];
  }

  interact(method: "mouse" | "keyboard"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state = this.state === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }

  #fillHeaderDrawObjects(): void {
    const { canvas } = this.tui;
    const { drawnObjects, headers } = this;

    for (let i = drawnObjects.headers.length; i < headers.length; ++i) {
      const textRectangle = { column: 0, row: 0 };
      const text = new TextObject({
        canvas,
        view: () => this.view,
        zIndex: () => this.zIndex,
        value: () => headers[i].title,
        style: () => this.theme.header[this.state],
        rectangle: () => {
          const { column, row } = this.rectangle;
          textRectangle.column = column + headers.reduce((a, b, j) => {
            if (j >= i) return a;
            return a + b.width + 1;
          }, 0) + 1;
          textRectangle.row = row + 1;
          return textRectangle;
        },
      });

      drawnObjects.headers.push(text);
      text.draw();
    }
  }

  #popUnusedHeaderDrawObjects(): void {
    for (const header of this.drawnObjects.headers.splice(this.headers.length)) {
      header.erase();
    }
  }

  #fillDataDrawObjects(): void {
    const { canvas } = this.tui;
    const { drawnObjects, headers, offsetRow } = this;

    for (let i = drawnObjects.data.length; i < this.rectangle.height - 4; ++i) {
      const textRectangle = { column: 0, row: 0 };
      const text = new TextObject({
        canvas,
        view: () => this.view,
        zIndex: () => this.zIndex,
        style: () => (i + this.offsetRow) === this.selectedRow ? this.theme.selectedRow[this.state] : this.style,
        value: () => {
          let string = "";
          let prevData = "";
          for (const [j, dataCell] of this.data[i + this.offsetRow].entries()) {
            if (j !== 0) string += " ".repeat(headers[j - 1].width - textWidth(prevData) + 1);
            string += dataCell;
            prevData = dataCell;
          }
          string += " ".repeat(this.rectangle.width - 1 - textWidth(string));
          return string;
        },
        rectangle: () => {
          const { column, row } = this.rectangle;
          textRectangle.column = column + 1;
          textRectangle.row = row + i + 3 - offsetRow;
          return textRectangle;
        },
      });

      drawnObjects.data.push(text);
      text.draw();
    }
  }

  #popUnusedDataDrawObjects(): void {
    for (const dataCell of this.drawnObjects.data.splice(this.data.length)) {
      dataCell.erase();
    }
  }
}
