// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { TextObject } from "../canvas/text.ts";
import { Component, ComponentOptions } from "../component.ts";

import { cropToWidth, textWidth } from "../utils/strings.ts";

import type { Rectangle } from "../types.ts";
import { BaseSignal, Computed, Effect } from "../signals.ts";
import { signalify } from "../utils/signals.ts";

export type LabelRectangle = Omit<Rectangle, "width" | "height"> & {
  width?: number;
  height?: number;
};

export interface LabelAlign {
  vertical: "top" | "center" | "bottom";
  horizontal: "left" | "center" | "right";
}

export interface LabelOptions extends Omit<ComponentOptions, "rectangle"> {
  text: string | BaseSignal<string>;
  rectangle: LabelRectangle | BaseSignal<LabelRectangle>;
  align?: LabelAlign | BaseSignal<LabelAlign>;
  multiCodePointSupport?: boolean | BaseSignal<boolean>;
  overwriteRectangle?: boolean | BaseSignal<boolean>;
}

export class Label extends Component {
  declare drawnObjects: { texts: TextObject[] };

  #valueLines?: string[];

  text: BaseSignal<string>;
  align: BaseSignal<LabelAlign>;
  overwriteRectangle: BaseSignal<boolean>;
  multiCodePointSupport: BaseSignal<boolean>;

  constructor(options: LabelOptions) {
    super(options as ComponentOptions);

    this.text = signalify(options.text);
    this.overwriteRectangle = signalify(options.overwriteRectangle ?? false);
    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);
    this.align = signalify(options.align ?? { vertical: "top", horizontal: "left" }, { deepObserve: true });

    new Effect(() => {
      const value = this.text.value;
      const rectangle = this.rectangle.value;
      const overwriteRectangle = this.overwriteRectangle.value;

      const lastValueLines = this.#valueLines;
      const valueLines = this.#valueLines = value.split("\n");
      if (!overwriteRectangle) {
        rectangle.width = valueLines.reduce((p, c) => Math.max(p, textWidth(c)), 0);
        rectangle.height = valueLines.length;
      }

      if (!lastValueLines) return;
      if (valueLines.length > lastValueLines.length) {
        this.#fillDrawObjects();
      } else if (valueLines.length < lastValueLines.length) {
        this.#popUnusedDrawObjects();
      }
    });
  }

  draw(): void {
    super.draw();
    this.drawnObjects.texts = [];
    this.#valueLines = this.text.peek().split("\n");
    this.#fillDrawObjects();
  }

  #fillDrawObjects(): void {
    if (!this.#valueLines) throw "#valueLines has to be set";

    const { drawnObjects } = this;

    for (let offset = drawnObjects.texts.length; offset < this.#valueLines.length; ++offset) {
      const textRectangle = { column: 0, row: 0, width: 0, height: 0 };
      const text = new TextObject({
        canvas: this.tui.canvas,
        view: this.view,
        style: this.style,
        zIndex: this.zIndex,
        multiCodePointSupport: this.multiCodePointSupport,
        value: new Computed(() => {
          // associate computed with this.text
          this.text.value;
          const value = this.#valueLines![offset];
          return cropToWidth(value, this.rectangle.value.width);
        }),
        rectangle: new Computed(() => {
          // associate computed with this.text
          this.text.value;

          const { column, row, width, height } = this.rectangle.value;
          textRectangle.column = column;
          textRectangle.row = row + offset;

          let value = this.#valueLines![offset];
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
              textRectangle.row += ~~(height / 2 - this.#valueLines!.length / 2);
              break;
            case "bottom":
              textRectangle.row += height - this.#valueLines!.length;
              break;
          }

          return textRectangle;
        }),
      });

      drawnObjects.texts[offset] = text;
      text.draw();
    }
  }

  #popUnusedDrawObjects(): void {
    if (!this.#valueLines) throw "#valueLines has to be set";

    for (const text of this.drawnObjects.texts.splice(this.#valueLines.length)) {
      text.erase();
    }
  }
}
