// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Component, ComponentOptions } from "../component.ts";
import { TextPainter, TextRectangle } from "../canvas/painters/text.ts";
import { Computed, Effect, Signal, SignalOfObject } from "../signals/mod.ts";

import { signalify } from "../utils/signals.ts";
import { cropToWidth, textWidth } from "../utils/strings.ts";

/**
 * Type that describes position and size of Label
 * When `width` or `height` isn't set, they gets automatically calculated depending of given value text width and amount of lines
 */
export type LabelRectangle = {
  column: number;
  row: number;
  width?: number;
  height?: number;
};

/** Type that describes text positioning in label */
export interface LabelAlign {
  vertical: "top" | "center" | "bottom";
  horizontal: "left" | "center" | "right";
}

export interface LabelOptions extends Omit<ComponentOptions, "rectangle"> {
  text: string | Signal<string>;
  rectangle: LabelRectangle | SignalOfObject<LabelRectangle>;
  align?: LabelAlign | SignalOfObject<LabelAlign>;
  multiCodePointSupport?: boolean | Signal<boolean>;
  overwriteRectangle?: boolean | Signal<boolean>;
}

/**
 * Component for creating multi-line, non interactive text
 *
 * @example
 * ```ts
 * new Label({
 *  parent: tui,
 *  text: "Hello\nthere"
 *  align: {
 *    horizontal: "center",
 *    vertical: "center",
 *  },
 *  theme: {
 *    base: crayon.magenta,
 *  },
 *  rectangle: {
 *    column: 1,
 *    row: 1,
 *  },
 *  zIndex: 0,
 * });
 * ```
 *
 * If you need to use emojis or other multi codepoint characters set `multiCodePointSupport` property to true.
 * @example
 * ```ts
 * new Label({
 *  ...,
 *  text: "🧡",
 *  multiCodePointCharacter: true,
 * });
 * ```
 * Rectangle properties – `width` and `height` are calculated automatically by default.
 * To overwrite that behaviour set `overwriteRectangle` property to true.
 *
 * @example
 * ```ts
 * new Label({
 *  ...,
 *  text: "1 2 3 cut me",
 *  overwriteRectangle: true,
 *  rectangle: {
 *    column: 1,
 *    row: 1,
 *    width: 6,
 *    height: 1,
 *  },
 * })
 * ```
 */
export class Label extends Component {
  declare drawnObjects: { texts: TextPainter[] };

  #valueLines: Signal<string[]>;

  text: Signal<string>;
  align: Signal<LabelAlign>;
  overwriteRectangle: Signal<boolean>;
  multiCodePointSupport: Signal<boolean>;

  constructor(options: LabelOptions) {
    super(options as ComponentOptions);

    this.text = signalify(options.text);
    this.overwriteRectangle = signalify(options.overwriteRectangle ?? false);
    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);
    this.align = signalify(options.align ?? { vertical: "top", horizontal: "left" }, { deepObserve: true });

    this.#valueLines = new Computed(() => this.text.value.split("\n"));

    new Effect(() => {
      const rectangle = this.rectangle.value;
      const overwriteRectangle = this.overwriteRectangle.value;
      const valueLines = this.#valueLines.value;

      if (!overwriteRectangle) {
        rectangle.width = valueLines.reduce((p, c) => Math.max(p, textWidth(c)), 0);
        rectangle.height = valueLines.length;
      }

      const drawnTexts = (this.drawnObjects.texts ??= []).length;

      if (valueLines.length > drawnTexts) {
        this.#fillDrawObjects();
      } else if (valueLines.length < drawnTexts) {
        this.#popUnusedDrawObjects();
      }
    });
  }

  draw(): void {
    super.draw();
    this.drawnObjects.texts ??= [];
    this.#fillDrawObjects();
  }

  #fillDrawObjects(): void {
    if (!this.#valueLines) throw new Error("#valueLines has to be set");

    const { drawnObjects } = this;

    for (let offset = drawnObjects.texts.length; offset < this.#valueLines.peek().length; ++offset) {
      const textRectangle: TextRectangle = { column: 0, row: 0, width: 0 };
      const text = new TextPainter({
        canvas: this.tui.canvas,
        view: this.view,
        style: this.style,
        zIndex: this.zIndex,
        multiCodePointSupport: this.multiCodePointSupport,
        value: new Computed(() => {
          const value = this.#valueLines.value[offset];
          return cropToWidth(value, this.rectangle.value.width);
        }),
        rectangle: new Computed(() => {
          const valueLines = this.#valueLines.value;

          const { column, row, width, height } = this.rectangle.value;
          textRectangle.column = column;
          textRectangle.row = row + offset;

          let value = valueLines[offset];
          value = cropToWidth(value, width);
          const valueWidth = textWidth(value);

          const { vertical, horizontal } = this.align.value;
          switch (horizontal) {
            case "center":
              textRectangle.column += ~~((width - valueWidth) / 2);
              break;
            case "right":
              textRectangle.column += width - valueWidth;
              break;
          }

          textRectangle.row = row + offset;
          switch (vertical) {
            case "center":
              textRectangle.row += ~~(height / 2 - valueLines.length / 2);
              break;
            case "bottom":
              textRectangle.row += height - valueLines.length;
              break;
          }

          // FIXME: Crop text if necessary

          return textRectangle;
        }),
      });

      drawnObjects.texts[offset] = text;
      text.draw();
    }
  }

  #popUnusedDrawObjects(): void {
    if (!this.#valueLines) throw new Error("#valueLines has to be set");

    for (const text of this.drawnObjects.texts.splice(this.#valueLines.peek().length)) {
      text.erase();
    }
  }
}
