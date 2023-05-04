// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { TextObject } from "../canvas/text.ts";
import { Component, ComponentOptions } from "../component.ts";
import { BaseSignal } from "../signals.ts";
import { Rectangle } from "../types.ts";
import { signalify } from "../utils/signals.ts";

export type TextRectangle = Omit<Rectangle, "width" | "height"> & {
  width?: number;
};

export interface TextOptions extends Omit<ComponentOptions, "rectangle"> {
  text: string | BaseSignal<string>;
  rectangle: TextRectangle | BaseSignal<TextRectangle>;
  overwriteWidth?: boolean | BaseSignal<boolean>;
  multiCodePointSupport?: boolean | BaseSignal<boolean>;
}

export class Text extends Component {
  declare drawnObjects: { text: TextObject };

  text: BaseSignal<string>;
  overwriteRectangle: BaseSignal<boolean>;
  multiCodePointSupport: BaseSignal<boolean>;

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
      rectangle: this.rectangle,
      multiCodePointSupport: this.multiCodePointSupport,
      overwriteRectangle: this.overwriteRectangle,
    });

    this.drawnObjects.text = text;
    text.draw();
  }
}
