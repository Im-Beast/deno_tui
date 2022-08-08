import { Component, ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";
import { textWidth } from "../utils/strings.ts";
import { EventRecord } from "../utils/typed_event_target.ts";

export interface LabelTextAlign {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
}

export interface LabelComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  value: string;
  align: LabelTextAlign;
}

export class LabelComponent<EventMap extends EventRecord = Record<never, never>> extends Component<EventMap> {
  #dynamicWidth: boolean;
  #dynamicHeight: boolean;

  declare rectangle: Rectangle;
  value: string;
  align: LabelTextAlign;

  constructor(options: LabelComponentOptions) {
    super(options);
    this.value = options.value;
    this.align = options.align;

    this.#dynamicWidth = this.rectangle.width === -1;
    this.#dynamicHeight = this.rectangle.height === -1;
  }

  draw() {
    super.draw();

    const { style, align, value } = this;
    const { canvas } = this.tui;

    const lines = value.split("\n");

    const dynamicWidth = this.#dynamicWidth;
    const dynamicHeight = this.#dynamicHeight;

    if (dynamicWidth) this.rectangle.width = -1;
    if (dynamicHeight) this.rectangle.height = -1;

    if (dynamicWidth || dynamicHeight) {
      for (const [i, line] of lines.entries()) {
        if (dynamicWidth) this.rectangle.width = Math.max(this.rectangle.width, textWidth(line));
        if (dynamicHeight) this.rectangle.height = Math.max(this.rectangle.height, i + 1);
      }
    }

    const { column, row, width, height } = this.rectangle;

    for (const [i, line] of lines.entries()) {
      let r = row + i;
      let c = column;

      switch (align.horizontal) {
        case "left":
          break;
        case "center":
          c += (width - textWidth(line)) / 2;
          break;
        case "right":
          c += width - textWidth(line);
          break;
      }

      switch (align.vertical) {
        case "top":
          break;
        case "center":
          r += height / 2 - lines.length / 2;
          break;
        case "bottom":
          r += height - lines.length;
          break;
      }

      canvas.draw(c, r, style(line), this.rectangle);
    }
  }
}
