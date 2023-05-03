// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Component, ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";
import { TextObject } from "../canvas/text.ts";

import type { DeepPartial, Rectangle } from "../types.ts";
import { Theme } from "../theme.ts";
import { textWidth } from "../utils/strings.ts";
import { clamp } from "../utils/numbers.ts";
import { BaseSignal, Computed, Effect, Signal } from "../signals.ts";
import { signalify } from "../utils/signals.ts";

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

    header: TextObject;
    data: TextObject[];
  };

  data: BaseSignal<string[][]>;
  headers: BaseSignal<TableHeader<true>[]>;
  charMap: BaseSignal<TableUnicodeCharactersType>;
  selectedRow: BaseSignal<number>;
  offsetRow: BaseSignal<number>;

  constructor(options: TableOptions) {
    super(options as unknown as ComponentOptions);

    this.data = signalify(options.data, { deepObserve: true });
    this.charMap = signalify(
      typeof options.charMap === "string" ? TableUnicodeCharacters[options.charMap] : options.charMap,
      { deepObserve: true },
    );
    this.headers = signalify(options.headers as TableHeader<true>[], { deepObserve: true });
    this.selectedRow = new Signal(0);
    this.offsetRow = new Signal(0);

    new Effect(() => {
      const headers = this.headers.value;
      let width = 1;
      for (let i = 0; i < headers.length; ++i) {
        const header = headers[i];
        header.width = Math.max(
          textWidth(header.title),
          this.data.value.reduce((a, b) => Math.max(a, textWidth(b[i])), 0),
        );
        width += header.width + 1;
      }
      this.rectangle.value.width = width;
    });

    this.data.subscribe((data) => {
      const dataDrawObjects = this.drawnObjects.data?.length;
      if (!dataDrawObjects) return;
      if (data.length > dataDrawObjects) {
        this.#fillDataDrawObjects();
      } else if (data.length < dataDrawObjects) {
        this.#popUnusedDataDrawObjects();
      }
    });

    this.on("keyPress", ({ key, ctrl, meta, shift }) => {
      if (ctrl || meta || shift) return;

      const { height } = this.rectangle.peek();
      const lastDataRow = this.data.peek().length - 1;

      const { selectedRow, offsetRow } = this;

      switch (key) {
        case "up":
          --selectedRow.value;
          break;
        case "down":
          ++selectedRow.value;
          break;
        case "pageup":
          selectedRow.value -= ~~(lastDataRow / 100);
          break;
        case "pagedown":
          selectedRow.value += ~~(lastDataRow / 100);
          break;
        case "home":
          selectedRow.value = 0;
          break;
        case "end":
          selectedRow.value = lastDataRow;
          break;
      }

      selectedRow.value = clamp(selectedRow.peek(), 0, lastDataRow - 1);
      offsetRow.value = clamp(selectedRow.peek() - ~~((height - 4) / 2), 0, lastDataRow - height + 5);
    });

    this.on("mouseEvent", (mouseEvent) => {
      if (mouseEvent.ctrl || mouseEvent.meta || mouseEvent.shift) return;
      const { y } = mouseEvent;
      const { row, height } = this.rectangle.peek();

      const lastDataRow = this.data.peek().length - 1;

      if ("scroll" in mouseEvent) {
        this.offsetRow.value = clamp(this.offsetRow.peek() + mouseEvent.scroll, 0, lastDataRow - height + 5);
      } else if ("button" in mouseEvent && y >= row + 3 && y <= row + height - 2) {
        const dataRow = y - row + this.offsetRow.peek() - 3;
        if (dataRow !== clamp(dataRow, 0, lastDataRow)) return;
        this.selectedRow.value = dataRow;
      }
    });
  }

  draw(): void {
    super.draw();

    const { canvas } = this.tui;
    const { drawnObjects } = this;

    // Drawing header cells
    const headerRectangle = { column: 0, row: 0 };
    const header = new TextObject({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      style: new Computed(() => this.theme.header[this.state.value]),
      rectangle: new Computed(() => {
        const { column, row } = this.rectangle.value;
        headerRectangle.column = column + 1;
        headerRectangle.row = row + 1;
        return headerRectangle;
      }),
      value: new Computed(() => {
        // associate computed with this.data
        this.data.value;

        const headers = this.headers.value;
        let value = "";

        for (const header of headers) {
          value += header.title + " ".repeat(header.width + 1 - textWidth(header.title));
        }

        return value;
      }),
    });

    header.draw();
    drawnObjects.header = header;

    // Drawing data cells
    drawnObjects.data = [];
    this.#fillDataDrawObjects();

    // Drawing frame
    const frameStyleSignal = new Computed(() => this.theme.frame[this.state.value]);

    const topRectangle = { column: 0, row: 0 };
    const top = new TextObject({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      style: frameStyleSignal,
      rectangle: new Computed(() => {
        const { column, row } = this.rectangle.value;
        topRectangle.column = column;
        topRectangle.row = row;
        return topRectangle;
      }),
      value: new Computed(() => {
        const { topLeft, horizontal, topRight } = this.charMap.value;
        return topLeft + horizontal.repeat(this.rectangle.value.width - 2) + topRight;
      }),
    });
    top.draw();

    const bottomRectangle = { column: 0, row: 0 };
    const bottom = new TextObject({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      style: frameStyleSignal,
      rectangle: new Computed(() => {
        const { column, row, height } = this.rectangle.value;
        bottomRectangle.column = column;
        bottomRectangle.row = row + height - 1;
        return bottomRectangle;
      }),
      value: new Computed(() => {
        const { bottomLeft, horizontal, bottomRight } = this.charMap.value;
        return bottomLeft + horizontal.repeat(this.rectangle.value.width - 2) + bottomRight;
      }),
    });
    bottom.draw();

    const verticalCharMapSignal = new Computed(() => this.charMap.value.vertical);

    const leftRectangle = { column: 0, row: 0, width: 1, height: 0 };
    const left = new BoxObject({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      style: frameStyleSignal,
      filler: verticalCharMapSignal,
      rectangle: new Computed(() => {
        const { column, row, height } = this.rectangle.value;
        leftRectangle.column = column;
        leftRectangle.row = row + 1;
        leftRectangle.height = height - 2;
        return leftRectangle;
      }),
    });
    left.draw();

    const rightRectangle = { column: 0, row: 0, width: 1, height: 0 };
    const right = new BoxObject({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      filler: verticalCharMapSignal,
      style: frameStyleSignal,
      rectangle: new Computed(() => {
        const { column, row, width, height } = this.rectangle.value;
        rightRectangle.column = column + width - 1;
        rightRectangle.row = row + 1;
        rightRectangle.height = height - 2;
        return rightRectangle;
      }),
    });
    right.draw();

    const middleRectangle = { column: 0, row: 0 };
    const spacer = new TextObject({
      canvas,
      zIndex: this.zIndex,
      style: frameStyleSignal,
      rectangle: new Computed(() => {
        const { column, row } = this.rectangle.value;
        middleRectangle.column = column;
        middleRectangle.row = row + 2;
        return middleRectangle;
      }),
      value: new Computed(() => {
        const { leftHorizontal, horizontal, rightHorizontal } = this.charMap.value;
        return leftHorizontal + horizontal.repeat(this.rectangle.value.width - 2) + rightHorizontal;
      }),
    });
    spacer.draw();

    drawnObjects.frame = [top, bottom, spacer, left, right];
  }

  interact(method: "mouse" | "keyboard"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state.value = this.state.peek() === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }

  #fillDataDrawObjects(): void {
    const { canvas } = this.tui;
    const { drawnObjects } = this;

    for (let i = drawnObjects.data.length; i < this.rectangle.peek().height - 4; ++i) {
      const textRectangle = { column: 0, row: 0 };
      const text = new TextObject({
        canvas,
        view: this.view,
        zIndex: this.zIndex,
        style: new Computed(() => {
          const offsetRow = this.offsetRow.value;
          const selectedRow = this.selectedRow.value;
          const selectedRowStyle = this.theme.selectedRow[this.state.value];
          const style = this.style.value;
          return (i + offsetRow) === selectedRow ? selectedRowStyle : style;
        }),
        value: new Computed(() => {
          const dataRow = this.data.value[i + this.offsetRow.value];
          const headers = this.headers.value;

          let string = "";
          let prevData = "";
          for (const [j, dataCell] of dataRow.entries()) {
            if (j !== 0) string += " ".repeat(headers[j - 1].width - textWidth(prevData) + 1);
            string += dataCell;
            prevData = dataCell;
          }

          string += " ".repeat(this.rectangle.value.width - 1 - textWidth(string));
          return string;
        }),
        rectangle: new Computed(() => {
          const { column, row } = this.rectangle.value;
          textRectangle.column = column + 1;
          textRectangle.row = row + i + 3;
          return textRectangle;
        }),
      });

      drawnObjects.data.push(text);
      text.draw();
    }
  }

  #popUnusedDataDrawObjects(): void {
    for (const dataCell of this.drawnObjects.data.splice(this.data.value.length)) {
      dataCell.erase();
    }
  }
}
