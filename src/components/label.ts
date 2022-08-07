import { Component, ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";
import { EventRecord, textWidth } from "../util.ts";

export interface LabelTextAlign {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
}

export interface LabelComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  value: string;
  align: LabelTextAlign;
}

export class LabelComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends Component<EventMap> {
  declare rectangle: Rectangle;
  value: string;
  align: LabelTextAlign;

  constructor(options: LabelComponentOptions) {
    super(options);
    this.value = options.value;
    this.align = options.align;
  }

  draw() {
    super.draw();

    const { style, align, value } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    let r = row;
    let c = column;

    switch (align.horizontal) {
      case "left":
        break;
      case "center":
        c += width / 2;
        break;
      case "right":
        c += width - textWidth(value);
        break;
    }

    switch (align.vertical) {
      case "top":
        break;
      case "center":
        r += height / 2;
        break;
      case "bottom":
        r += height - 1;
        break;
    }

    canvas.draw(c, r, style(value));
  }
}
