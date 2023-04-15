import { Box } from "./box.ts";
import { Theme } from "../theme.ts";
import { ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";

import { clamp, normalize } from "../utils/numbers.ts";

import type { DeepPartial } from "../types.ts";

export type SliderOrientation = "vertical" | "horizontal";

export interface SliderTheme extends Theme {
  thumb: Theme;
}

export interface SliderOptions extends ComponentOptions {
  min: number;
  max: number;
  step: number;
  value: number;
  adjustThumbSize?: boolean;
  orientation: SliderOrientation;
  theme: DeepPartial<SliderTheme, "thumb">;
}

export class Slider extends Box {
  declare drawnObjects: { box: BoxObject; thumb: BoxObject };
  declare theme: SliderTheme;

  min: number;
  max: number;
  step: number;
  value: number;
  adjustThumbSize: boolean;
  orientation: SliderOrientation;

  constructor(options: SliderOptions) {
    super(options);
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
    this.value = options.value ?? 0;
    this.orientation = options.orientation;
    this.adjustThumbSize = options.adjustThumbSize ?? false;

    this.on("keyPress", (keyPress) => {
      const { value } = this;

      switch (keyPress.key) {
        case "up":
        case "right":
          this.value = clamp(this.value + this.step, this.min, this.max);
          break;
        case "down":
        case "left":
          this.value = clamp(this.value - this.step, this.min, this.max);
          break;
      }

      if (this.value !== value) {
        this.emit("valueChange", this);
      }
    });

    this.on("mousePress", ({ drag, movementX, movementY }) => {
      if (!drag) return;
      const { value } = this;

      this.value = clamp(
        this.value + (this.orientation === "horizontal" ? movementX : movementY) * this.step,
        this.min,
        this.max,
      );

      if (this.value !== value) {
        this.emit("valueChange", this);
      }
    });
  }

  update(): void {
    super.update();
  }

  draw(): void {
    super.draw();

    const thumbRectangle = { column: 0, row: 0, width: 0, height: 0 };

    const thumb = new BoxObject({
      canvas: this.tui.canvas,
      view: () => this.view,
      rectangle: () => {
        const { value, min, max } = this;
        const { column, row, width, height } = this.rectangle;
        const horizontal = this.orientation === "horizontal";
        const normalizedValue = normalize(value, min, max);

        if (horizontal) {
          const thumbSize = this.adjustThumbSize ? Math.round((width) / (max - min)) : 1;

          thumbRectangle.column = Math.min(
            column + width - thumbSize,
            column + Math.round((width - 1) * normalizedValue),
          );
          thumbRectangle.row = row;
          thumbRectangle.width = thumbSize;
          thumbRectangle.height = height;
        } else {
          const thumbSize = this.adjustThumbSize ? Math.round((height) / (max - min)) : 1;

          thumbRectangle.column = column;
          thumbRectangle.row = Math.min(
            row + height - thumbSize,
            row + Math.round((height - 1) * normalizedValue),
          );
          thumbRectangle.width = width;
          thumbRectangle.height = thumbSize;
        }

        return thumbRectangle;
      },
      style: () => this.theme.thumb[this.state],
      zIndex: () => this.zIndex,
    });

    this.drawnObjects.thumb = thumb;
    thumb.draw();
  }

  interact(method: "keyboard" | "mouse"): void {
    super.interact(method);
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state = this.state === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";
  }
}
