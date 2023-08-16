// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Component, ComponentOptions } from "../component.ts";
import { TextPainter } from "../canvas/painters/text.ts";
import { Computed, Signal, SignalOfObject } from "../signals/mod.ts";

import { signalify } from "../utils/signals.ts";
import { splitToArray } from "../utils/strings.ts";

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
  declare drawnObjects: { text: TextPainter<string[]> };

  #textLines: Signal<string[]>;

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

    // FIXME: alignment and stuff needs to be reimplemented

    const textLines: string[] = [];
    this.#textLines = new Computed(() => {
      const text = this.text.value;
      splitToArray(text, "\n", textLines);
      return textLines;
    });
  }

  draw(): void {
    super.draw();

    const text = new TextPainter({
      canvas: this.tui.canvas,
      view: this.view,
      style: this.style,
      zIndex: this.zIndex,
      rectangle: this.rectangle,
      text: this.#textLines,
      alignHorizontally: 0.5,
      alignVertically: 0.5,
      overwriteRectangle: this.overwriteRectangle,
    });

    this.drawnObjects.text = text;
    text.draw();
  }
}
