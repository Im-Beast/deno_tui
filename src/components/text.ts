// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { TextObject, TextRectangle } from "../canvas/text.ts";
import { Component, ComponentOptions } from "../component.ts";
import { Signal, SignalOfObject } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";

export interface TextOptions extends Omit<ComponentOptions, "rectangle"> {
  text: string | Signal<string>;
  overwriteWidth?: boolean | Signal<boolean>;
  multiCodePointSupport?: boolean | Signal<boolean>;
  rectangle: TextRectangle | SignalOfObject<TextRectangle>;
}

/**
 * Component for creating single-line, non interactive text
 *
 * @example
 * ```ts
 * new Text({
 *  parent: tui,
 *  text: "Hello there"
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
 * new Text({
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
 * new Text({
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
export class Text extends Component {
  declare drawnObjects: { text: TextObject };

  text: Signal<string>;
  overwriteRectangle: Signal<boolean>;
  multiCodePointSupport: Signal<boolean>;

  constructor(options: TextOptions) {
    super(options as unknown as ComponentOptions);
    this.text = signalify(options.text);
    this.overwriteRectangle = signalify(options.overwriteWidth ?? false);
    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);
  }

  draw(): void {
    const text = new TextObject({
      canvas: this.tui.canvas,
      view: this.view,
      value: this.text,
      style: this.style,
      zIndex: this.zIndex,
      rectangle: this.rectangle as unknown as Signal<TextRectangle>,
      multiCodePointSupport: this.multiCodePointSupport,
      overwriteRectangle: this.overwriteRectangle,
    });

    this.drawnObjects.text = text;
    text.draw();
  }
}
