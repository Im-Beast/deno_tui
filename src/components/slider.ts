// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Box } from "./box.ts";
import { Theme } from "../theme.ts";
import { ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";

import { clamp, normalize } from "../utils/numbers.ts";

import type { DeepPartial } from "../types.ts";
import { BaseSignal, Computed } from "../signals.ts";
import { signalify } from "../utils/signals.ts";

export type SliderOrientation = "vertical" | "horizontal";

export interface SliderTheme extends Theme {
  thumb: Theme;
}

export interface SliderOptions extends ComponentOptions {
  min: number | BaseSignal<number>;
  max: number | BaseSignal<number>;
  step: number | BaseSignal<number>;
  value: number | BaseSignal<number>;
  adjustThumbSize: boolean | BaseSignal<boolean>;
  orientation: SliderOrientation | BaseSignal<SliderOrientation>;
  theme: DeepPartial<SliderTheme, "thumb">;
}

export class Slider extends Box {
  declare drawnObjects: { box: BoxObject; thumb: BoxObject };
  declare theme: SliderTheme;

  min: BaseSignal<number>;
  max: BaseSignal<number>;
  step: BaseSignal<number>;
  value: BaseSignal<number>;
  adjustThumbSize: BaseSignal<boolean>;
  orientation: BaseSignal<SliderOrientation>;

  constructor(options: SliderOptions) {
    super(options);
    this.min = signalify(options.min);
    this.max = signalify(options.max);
    this.step = signalify(options.step);
    this.value = signalify(options.value ?? 0);
    this.orientation = signalify(options.orientation);
    this.adjustThumbSize = signalify(options.adjustThumbSize ?? false);

    this.on("keyPress", ({ key, ctrl, shift, meta }) => {
      if (ctrl || shift || meta) return;

      const min = this.min.peek();
      const max = this.max.peek();
      const step = this.step.peek();
      const value = this.value.peek();

      switch (key) {
        case "up":
        case "right":
          this.value.value = clamp(value + step, min, max);
          break;
        case "down":
        case "left":
          this.value.value = clamp(value - step, min, max);
          break;
      }
    });

    this.on("mousePress", ({ drag, movementX, movementY, ctrl, shift, meta }) => {
      if (!drag || ctrl || shift || meta) return;

      const { min, max, step, value, orientation } = this;

      value.value = clamp(
        value.peek() + (orientation.peek() === "horizontal" ? movementX : movementY) * step.peek(),
        min.peek(),
        max.peek(),
      );
    });

    this.on("mouseScroll", ({ scroll }) => {
      const { min, max, step, value } = this;

      this.value.value = clamp(value.peek() + scroll * step.peek(), min.peek(), max.peek());
    });
  }

  draw(): void {
    super.draw();

    const thumbRectangle = { column: 0, row: 0, width: 0, height: 0 };
    const thumb = new BoxObject({
      view: this.view,
      zIndex: this.zIndex,
      canvas: this.tui.canvas,
      style: new Computed(() => this.theme.thumb[this.state.value]),
      rectangle: new Computed(() => {
        const value = this.value.value;
        const min = this.min.value;
        const max = this.max.value;

        const { column, row, width, height } = this.rectangle.value;
        const horizontal = this.orientation.value === "horizontal";
        const normalizedValue = normalize(value, min, max);

        if (horizontal) {
          const thumbSize = this.adjustThumbSize.value ? Math.round((width) / (max - min)) : 1;

          thumbRectangle.column = Math.min(
            column + width - thumbSize,
            column + Math.round((width - 1) * normalizedValue),
          );
          thumbRectangle.row = row;
          thumbRectangle.width = thumbSize;
          thumbRectangle.height = height;
        } else {
          const thumbSize = this.adjustThumbSize.value ? Math.round((height) / (max - min)) : 1;

          thumbRectangle.column = column;
          thumbRectangle.row = Math.min(
            row + height - thumbSize,
            row + Math.round((height - 1) * normalizedValue),
          );
          thumbRectangle.width = width;
          thumbRectangle.height = thumbSize;
        }

        return thumbRectangle;
      }),
    });

    this.drawnObjects.thumb = thumb;
    thumb.draw();
  }

  interact(method: "keyboard" | "mouse"): void {
    super.interact(method);
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state.value = this.state.peek() === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";
  }
}
