// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { TextObject, TextRectangle } from "../canvas/text.ts";
import { Component, ComponentOptions } from "../component.ts";
import { Signal } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";

export interface TextOptions extends Omit<ComponentOptions, "rectangle"> {
  text: string | Signal<string>;
  rectangle: TextRectangle | Signal<TextRectangle>;
  overwriteWidth?: boolean | Signal<boolean>;
  multiCodePointSupport?: boolean | Signal<boolean>;
}

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
