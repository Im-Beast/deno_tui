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
    const { rectangle, style, zIndex, drawnObjects, multiCodePointSupport } = this;

    if (this.value !== this.#lastValue) {
      const lastValueLines = this.#valueLines;
      this.#valueLines = this.value.split("\n");

      if (this.#valueLines.length > lastValueLines!.length) {
        this.#fillDrawObjects();
      } else if (this.#valueLines.length < lastValueLines!.length) {
        this.#popUnusedDrawObjects();
      }

      this.#lastValue = this.value;
    }

    const { vertical, horizontal } = this.align;

    for (const [index, text] of drawnObjects.texts.entries()) {
      let value = this.#valueLines![index];
      value = textWidth(value) > rectangle.width ? value.slice(0, rectangle.width) : value;

      text.rectangle.column = rectangle.column;
      switch (horizontal) {
        case "center":
          text.rectangle.column += ~~((rectangle.width - textWidth(value)) / 2);
          break;
        case "right":
          text.rectangle.column += rectangle.width - textWidth(value);
          break;
      }

      text.rectangle.row = rectangle.row + index;
      switch (vertical) {
        case "center":
          text.rectangle.row += ~~(rectangle.height / 2 - this.#valueLines!.length / 2);
          break;
        case "bottom":
          text.rectangle.row += rectangle.height - this.#valueLines!.length;
          break;
      }

      text.value = value;
      text.style = style;
      text.zIndex = zIndex;
      text.multiCodePointSupport = multiCodePointSupport;
    }
  }

  draw(): void {
    super.draw();
    this.drawnObjects.texts = [];
    this.#valueLines = this.value.split("\n");
    this.#fillDrawObjects();
  }

  #fillDrawObjects(): void {
    if (!this.#valueLines) {
      throw "#fillDrawObjects has been used before #valueLines has been set";
    }

    const { rectangle, style, zIndex, drawnObjects, multiCodePointSupport } = this;

    for (let i = drawnObjects.texts.length; i < this.#valueLines.length; ++i) {
      if (i > rectangle.height) break;

      const value = this.#valueLines[i];

      const text = new TextObject({
        canvas: this.tui.canvas,
        value: textWidth(value) > rectangle.width ? value.slice(0, rectangle.width) : value,
        style: style,
        zIndex: zIndex,
        rectangle: {
          column: rectangle.column,
          row: rectangle.row + i,
        },
        multiCodePointSupport,
      });

      drawnObjects.texts[i] = text;
      text.draw();
    }
  }

  #popUnusedDrawObjects(): void {
    if (!this.#valueLines) {
      throw "#popUnusedDrawObjects has been used before #valueLines has been set";
    }

    for (const text of this.drawnObjects.texts.splice(this.#valueLines.length)) {
      text.erase();
    }
  }
}
