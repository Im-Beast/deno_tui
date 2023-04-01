import { TextObject } from "../canvas/text.ts";
import { Component, ComponentOptions } from "../component.ts";

import { textWidth } from "../utils/strings.ts";

import type { Rectangle } from "../types.ts";

export interface LabelAlign {
  vertical: "top" | "center" | "bottom";
  horizontal: "left" | "center" | "right";
}

export interface LabelOptions extends Omit<ComponentOptions, "rectangle"> {
  value: string;
  rectangle: Omit<Rectangle, "width" | "height"> & {
    width?: number;
    height?: number;
  };
  align?: LabelAlign;
  multiCodePointSupport?: boolean;
}

export class Label extends Component {
  declare drawnObjects: { texts: TextObject[] };

  #valueLines?: string[];
  #lastValue?: string;

  value: string;
  align: LabelAlign;
  multiCodePointSupport: boolean;

  constructor(options: LabelOptions) {
    super(options as unknown as ComponentOptions);
    this.value = options.value;
    this.align = options.align ?? {
      vertical: "top",
      horizontal: "left",
    };
    this.multiCodePointSupport = options.multiCodePointSupport ?? false;
  }

  update(): void {
    super.update();

    if (this.value === this.#lastValue) return;
    const lastValueLines = this.#valueLines;
    this.#valueLines = this.value.split("\n");

    if (this.#valueLines.length > lastValueLines!.length) {
      this.#fillDrawObjects();
    } else if (this.#valueLines.length < lastValueLines!.length) {
      this.#popUnusedDrawObjects();
    }

    this.#lastValue = this.value;
  }

  draw(): void {
    super.draw();
    this.drawnObjects.texts = [];
    this.#valueLines = this.value.split("\n");
    this.#fillDrawObjects();
  }

  #fillDrawObjects(): void {
    if (!this.#valueLines) throw "#valueLines has to be set";

    const { drawnObjects } = this;

    for (let offset = drawnObjects.texts.length; offset < this.#valueLines.length; ++offset) {
      const textRectangle = { column: 0, row: 0 };
      const text = new TextObject({
        canvas: this.tui.canvas,
        value: () => {
          const value = this.#valueLines![offset];
          const { width } = this.rectangle;
          return textWidth(value) > width ? value.slice(0, width) : value;
        },
        style: () => this.style,
        zIndex: () => this.zIndex,
        multiCodePointSupport: () => this.multiCodePointSupport,
        rectangle: () => {
          const { column, row, width, height } = this.rectangle;
          textRectangle.column = column;
          textRectangle.row = row + offset;

          let value = this.#valueLines![offset];
          value = textWidth(value) > width ? value.slice(0, width) : value;

          const { vertical, horizontal } = this.align;
          switch (horizontal) {
            case "center":
              textRectangle.column += Math.round((width - textWidth(value)) / 2);
              break;
            case "right":
              textRectangle.column += width - textWidth(value);
              break;
          }

          textRectangle.row = row + offset;
          switch (vertical) {
            case "center":
              textRectangle.row += Math.round(height / 2 - this.#valueLines!.length / 2);
              break;
            case "bottom":
              textRectangle.row += height - this.#valueLines!.length;
              break;
          }

          return textRectangle;
        },
      });

      drawnObjects.texts[offset] = text;
      text.draw();
    }
  }

  #popUnusedDrawObjects(): void {
    if (!this.#valueLines) throw "#valueLines has to be set";

    for (const text of this.drawnObjects.texts.splice(this.#valueLines.length)) {
      text.erase();
    }
  }
}
