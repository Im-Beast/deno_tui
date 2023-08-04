// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Component, ComponentOptions } from "../component.ts";

import { BoxPainter } from "../canvas/painters/box.ts";
import { TextPainter } from "../canvas/painters/text.ts";

import { Computed, Signal } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";

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

export interface FrameOptions extends ComponentOptions {
  charMap: keyof typeof FrameUnicodeCharacters | FrameUnicodeCharactersType;
}

/**
 * Component for creating non-interactive frames
 *
 * @example
 * ```ts
 * new Frame({
 *  parent: tui,
 *  charMap: "rounded",
 *  theme: {
 *    base: crayon.bgBlack.white,
 *  },
 *  rectangle: {
 *    column: 1,
 *    row: 1,
 *    height: 5,
 *    width: 10,
 *  },
 *  zIndex: 0,
 * });
 * ```
 *
 * If you want frame to follow component just link components rectangle as frame's rectangle.
 *
 * @example
 * ```ts
 * const box = new Box(...);
 *
 * new Frame({
 *  ...,
 *  rectangle: box.rectangle,
 * });
 * ```
 */
export class Frame extends Component {
  declare drawnObjects: {
    top: TextPainter;
    bottom: TextPainter;
    left: BoxPainter;
    right: BoxPainter;
  };

  charMap: Signal<FrameUnicodeCharactersType>;

  constructor(options: FrameOptions) {
    super(options);
    this.charMap = signalify(
      typeof options.charMap === "string" ? FrameUnicodeCharacters[options.charMap] : options.charMap,
    );
  }

  draw(): void {
    super.draw();

    const { canvas } = this.tui;

    const topRectangle = { column: 0, row: 0 };
    const top = new TextPainter({
      canvas,
      view: this.view,
      style: this.style,
      zIndex: this.zIndex,
      value: new Computed(() => {
        const { topLeft, horizontal, topRight } = this.charMap.value;
        return topLeft + horizontal.repeat(this.rectangle.value.width) + topRight;
      }),
      rectangle: new Computed(() => {
        const { column, row } = this.rectangle.value;
        topRectangle.column = column - 1;
        topRectangle.row = row - 1;
        return topRectangle;
      }),
    });

    const bottomRectangle = { column: 0, row: 0 };
    const bottom = new TextPainter({
      canvas,
      view: this.view,
      style: this.style,
      zIndex: this.zIndex,
      value: new Computed(() => {
        const { bottomLeft, horizontal, bottomRight } = this.charMap.value;
        return bottomLeft + horizontal.repeat(this.rectangle.value.width) + bottomRight;
      }),
      rectangle: new Computed(() => {
        const { column, row, height } = this.rectangle.value;
        bottomRectangle.column = column - 1;
        bottomRectangle.row = row + height;
        return bottomRectangle;
      }),
    });

    const verticalCharMapSignal = new Computed(() => this.charMap.value.vertical);

    const leftRectangle = { column: 0, row: 0, width: 1, height: 0 };
    const left = new BoxPainter({
      canvas,
      view: this.view,
      style: this.style,
      zIndex: this.zIndex,
      filler: verticalCharMapSignal,
      rectangle: new Computed(() => {
        const { column, row, height } = this.rectangle.value;
        leftRectangle.column = column - 1;
        leftRectangle.row = row;
        leftRectangle.height = height;
        return leftRectangle;
      }),
    });

    const rightRectangle = { column: 0, row: 0, width: 1, height: 0 };
    const right = new BoxPainter({
      canvas,
      view: this.view,
      style: this.style,
      zIndex: this.zIndex,
      filler: verticalCharMapSignal,
      rectangle: new Computed(() => {
        const { column, row, width, height } = this.rectangle.value;
        rightRectangle.column = column + width;
        rightRectangle.row = row;
        rightRectangle.height = height;
        return rightRectangle;
      }),
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
}
