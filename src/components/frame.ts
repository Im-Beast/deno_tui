import { Component, ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";
import { TextObject } from "../canvas/text.ts";

import type { Rectangle } from "../types.ts";

export const FrameUnicodeCharacters = {
  sharp: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
  } as const,
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
  } as const,
};

export type FrameUnicodeCharactersType = {
  [key in keyof typeof FrameUnicodeCharacters["rounded"]]: string;
};

export type FrameOptions =
  & Omit<ComponentOptions, "rectangle">
  & {
    charMap: keyof typeof FrameUnicodeCharacters | FrameUnicodeCharactersType;
  }
  & ({
    component: Component;
    rectangle?: never;
  } | {
    component?: never;
    rectangle: Rectangle;
  });

export class Frame extends Component {
  declare drawnObjects: {
    top: TextObject;
    bottom: TextObject;
    left: BoxObject;
    right: BoxObject;
  };

  charMap: FrameUnicodeCharactersType;
  component?: Component;

  constructor(options: FrameOptions) {
    options.rectangle ??= { column: 0, row: 0, width: 0, height: 0 };
    super(options as ComponentOptions);

    this.component = options.component;
    if (this.component) {
      this.#updateRelativeRectangle();
    }

    this.charMap = typeof options.charMap === "string" ? FrameUnicodeCharacters[options.charMap] : options.charMap;
  }

  update(): void {
    super.update();

    const { charMap, component } = this;

    if (component) this.#updateRelativeRectangle();

    const { top, bottom, left, right } = this.drawnObjects;
    const { column, row, width, height } = this.rectangle;

    top.style =
      bottom.style =
      left.style =
      right.style =
        this.style;

    top.zIndex =
      bottom.zIndex =
      left.zIndex =
      right.zIndex =
        this.zIndex;

    top.rectangle.column = column;
    top.rectangle.row = row;
    top.value = charMap.topLeft + charMap.horizontal.repeat(width - 2) + charMap.topRight;

    bottom.rectangle.column = column;
    bottom.rectangle.row = row + height - 1;
    bottom.value = charMap.bottomLeft + charMap.horizontal.repeat(width - 2) + charMap.bottomRight;

    left.rectangle.column = column;
    left.rectangle.row = row + 1;
    left.rectangle.width = 1;
    left.rectangle.height = height - 2;
    left.filler = charMap.vertical;

    right.rectangle.column = column + width - 1;
    right.rectangle.row = row + 1;
    right.rectangle.width = 1;
    right.rectangle.height = height - 2;
    right.filler = charMap.vertical;
  }

  draw(): void {
    super.draw();

    const { charMap, drawnObjects } = this;
    const { column, row, width, height } = this.rectangle;
    const { canvas } = this.tui;

    const top = new TextObject({
      canvas,
      rectangle: {
        column,
        row,
      },
      style: this.style,
      zIndex: this.zIndex,
      value: charMap.topLeft + charMap.horizontal.repeat(width - 2) + charMap.topRight,
    });

    const bottom = new TextObject({
      canvas,
      rectangle: {
        column,
        row: row + height - 1,
      },
      style: this.style,
      zIndex: this.zIndex,
      value: charMap.bottomLeft + charMap.horizontal.repeat(width - 2) + charMap.bottomRight,
    });

    const left = new BoxObject({
      canvas,
      rectangle: {
        column,
        row: row + 1,
        width: 1,
        height: height - 2,
      },
      style: this.style,
      zIndex: this.zIndex,
      filler: charMap.vertical,
    });

    const right = new BoxObject({
      canvas,
      rectangle: {
        column: column + width - 1,
        row: row + 1,
        width: 1,
        height: height - 2,
      },
      style: this.style,
      zIndex: this.zIndex,
      filler: charMap.vertical,
    });

    drawnObjects.top = top;
    drawnObjects.bottom = bottom;
    drawnObjects.left = left;
    drawnObjects.right = right;

    top.draw();
    bottom.draw();
    left.draw();
    right.draw();
  }

  #updateRelativeRectangle(): void {
    if (!this.component) {
      throw "updateRelativeRectangle has been used when Frame isn't based on any component";
    }

    const { column, row, width, height } = this.component.rectangle;
    this.rectangle.column = column - 1;
    this.rectangle.row = row - 1;
    this.rectangle.width = width + 2;
    this.rectangle.height = height + 2;
  }
}
