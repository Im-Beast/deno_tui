// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Component, ComponentOptions } from "../component.ts";

import { textWidth } from "../utils/strings.ts";

import type { Rectangle } from "../types.ts";
import type { EventRecord } from "../event_emitter.ts";

/** Interface describing positioning of label when given boundaries using `rectangle` */
export interface LabelTextAlign {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
}

/** Interface defining object that {LabelComponent}'s constructor can interpret */
export interface LabelComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  /** Position of label when given boundaries using `rectangle` */
  align: LabelTextAlign;
  /** Text displayed on label */
  value: string;
}

/** Implementation for {LabelComponent} class */
export type LabelComponentImplementation = LabelComponentOptions;

/**
 * Component that displays text in given `rectangle`
 * When `rectangle`'s `width` and/or `height` properties are set to `-1` then `width` and/or `height` are set dynamically depending on the text size.
 */
export class LabelComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends Component<EventMap> implements LabelComponentImplementation {
  #rectangle: Rectangle;
  value: string;
  align: LabelTextAlign;

  constructor(options: LabelComponentOptions) {
    super(options);

    this.value = options.value;
    this.align = options.align;
    this.#rectangle = options.rectangle;
    this.rectangle = options.rectangle;
  }

  get rectangle(): Rectangle {
    return this.#rectangle;
  }

  set rectangle(rectangle: Rectangle) {
    this.#rectangle = rectangle;

    const lines = this.value.split("\n");

    const dynamicWidth = this.#rectangle.width === -1;
    const dynamicHeight = this.#rectangle.width === -1;

    for (const [i, line] of lines.entries()) {
      if (dynamicWidth) this.rectangle.width = Math.max(this.rectangle.width, textWidth(line));
      if (dynamicHeight) this.rectangle.height = Math.max(this.rectangle.height, i + 1);
    }
  }

  draw(): void {
    super.draw();

    const { style, align, value } = this;
    const { canvas } = this.tui;

    const { column, row, width, height } = this.rectangle;

    const lines = value.split("\n");
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
