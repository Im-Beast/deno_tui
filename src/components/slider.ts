// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { BoxComponent } from "./box.ts";
import { ComponentOptions } from "../component.ts";
import { DeepPartial, Rectangle } from "../types.ts";
import { emptyStyle, Theme } from "../theme.ts";
import { ComponentEvent } from "../events.ts";
import { clamp, normalize } from "../utils/numbers.ts";
import { EventRecord } from "../utils/typed_event_target.ts";

export interface SliderTheme extends Theme {
  thumb: Theme;
}

export interface SliderComponentOptions extends ComponentOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  rectangle: Rectangle;
  direction: "horizontal" | "vertical";
  adjustThumbSize?: boolean;
  theme?: DeepPartial<SliderTheme>;
}

export type SliderComponentEventMap = {
  valueChange: ComponentEvent<"valueChange", SliderComponent>;
};

export class SliderComponent<EventMap extends EventRecord = Record<never, never>>
  extends BoxComponent<EventMap & SliderComponentEventMap> {
  declare theme: SliderTheme;
  direction: "horizontal" | "vertical";
  min: number;
  max: number;
  step: number;
  #value: number;
  adjustThumbSize: boolean;

  constructor(options: SliderComponentOptions) {
    super(options);
    this.direction = options.direction;
    this.min = options.min;
    this.max = options.max;
    this.#value = options.value;
    this.step = options.step;

    this.adjustThumbSize = options.adjustThumbSize ?? false;

    const thumb = options.theme?.thumb;
    this.theme.thumb = {
      active: thumb?.active ?? thumb?.focused ?? thumb?.base ?? emptyStyle,
      focused: thumb?.focused ?? thumb?.base ?? emptyStyle,
      base: thumb?.base ?? emptyStyle,
    };

    const lastMove = { x: -1, y: -1, time: 0 };

    this.tui.addEventListener("keyPress", ({ keyPress }) => {
      const { key, ctrl, meta, shift } = keyPress;

      if (ctrl || meta || shift) return;
      if (this.state !== "active" && this.state !== "focused") return;

      switch (key) {
        case "up":
        case "right":
          this.value += this.step;
          break;
        case "down":
        case "left":
          this.value -= this.step;
          break;
      }
    });

    this.tui.addEventListener("mousePress", ({ mousePress }) => {
      const { x, y, drag } = mousePress;

      if (Date.now() - lastMove.time > 300) {
        lastMove.x = -1;
        lastMove.y = -1;
      }

      if (!drag || (this.state !== "active" && this.state !== "focused")) return;

      switch (this.direction) {
        case "horizontal":
          if (lastMove.x === -1) break;
          this.value += (x - lastMove.x) * this.step;
          break;
        case "vertical":
          if (lastMove.y === -1) break;
          this.value += (y - lastMove.y) * this.step;
          break;
      }

      lastMove.x = x;
      lastMove.y = y;
      lastMove.time = Date.now();
    });
  }

  get value() {
    return this.#value;
  }

  set value(value) {
    const prev = this.#value;
    this.#value = clamp(value, this.min, this.max);

    if (this.#value !== prev) {
      this.dispatchEvent(new ComponentEvent("valueChange", this));
    }
  }

  draw() {
    super.draw();

    const { theme, state, value, min, max, direction } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    const normalizedValue = normalize(value, min, max);

    const thumbStyle = theme.thumb[state];

    switch (direction) {
      case "horizontal":
        {
          const thumbWidth = this.adjustThumbSize ? ~~((width - 1) / (max - min)) : 1;

          canvas.draw(
            column + normalizedValue * (width - thumbWidth),
            row,
            thumbStyle((" ".repeat(thumbWidth) + "\n").repeat(height)),
          );
        }
        break;
      case "vertical":
        {
          const thumbHeight = this.adjustThumbSize ? ~~((height - 1) / (max - min)) : 1;

          canvas.draw(
            column,
            row + normalizedValue * (height - thumbHeight),
            thumbStyle((" ".repeat(width) + "\n").repeat(thumbHeight)),
          );
        }
        break;
    }
  }

  interact() {
    this.state = this.state === "focused" || this.state === "active" ? "active" : "focused";
  }
}
