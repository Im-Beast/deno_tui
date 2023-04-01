// deno-lint-ignore-file
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
  },
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
  },
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
    if (this.component) {
      this.#updateRelativeRectangle();
    }
  }

  draw(): void {
    super.draw();

    const { canvas } = this.tui;

    const topRectangle = { column: 0, row: 0 };
    const top = new TextObject({
      canvas,
      style: () => this.style,
      zIndex: () => this.zIndex,
      value: () => {
        const { topLeft, horizontal, topRight } = this.charMap;
        return topLeft + horizontal.repeat(this.rectangle.width - 2) + topRight;
      },
      rectangle: () => {
        const { column, row } = this.rectangle;
        topRectangle.column = column;
        topRectangle.row = row;
        return topRectangle;
      },
    });

    const bottomRectangle = { column: 0, row: 0 };
    const bottom = new TextObject({
      canvas,
      style: () => this.style,
      zIndex: () => this.zIndex,
      value: () => {
        const { bottomLeft, horizontal, bottomRight } = this.charMap;
        return bottomLeft + horizontal.repeat(this.rectangle.width - 2) + bottomRight;
      },
      rectangle: () => {
        const { column, row, height } = this.rectangle;
        bottomRectangle.column = column;
        bottomRectangle.row = row + height - 1;
        return bottomRectangle;
      },
    });

    const leftRectangle = { column: 0, row: 0, width: 1, height: 0 };
    const left = new BoxObject({
      canvas,
      style: () => this.style,
      zIndex: () => this.zIndex,
      rectangle: () => {
        const { column, row, height } = this.rectangle;
        leftRectangle.column = column;
        leftRectangle.row = row + 1;
        leftRectangle.height = height - 2;
        return leftRectangle;
      },
      filler: () => this.charMap.vertical,
    });

    const rightRectangle = { column: 0, row: 0, width: 1, height: 0 };
    const right = new BoxObject({
      canvas,
      style: () => this.style,
      zIndex: () => this.zIndex,
      rectangle: () => {
        const { column, row, width, height } = this.rectangle;
        rightRectangle.column = column + width - 1;
        rightRectangle.row = row + 1;
        rightRectangle.height = height - 2;
        return rightRectangle;
      },
      filler: () => this.charMap.vertical,
    });

    const { drawnObjects } = this;

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
