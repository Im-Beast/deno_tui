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
  smooth: boolean;
  adjustThumbSize?: boolean;
  orientation: SliderOrientation;
  theme: DeepPartial<SliderTheme>;
}

export class Slider extends Box {
  declare drawnObjects: { box: BoxObject; thumb: BoxObject };
  declare theme: SliderTheme;

  min: number;
  max: number;
  step: number;
  value: number;
  smooth: boolean;
  adjustThumbSize: boolean;
  orientation: SliderOrientation;

  constructor(options: SliderOptions) {
    super(options);
    this.smooth = options.smooth;
    this.min = options.min;
    this.max = options.max;
    this.step = options.step;
    this.value = options.value ?? 0;
    this.orientation = options.orientation;
    this.adjustThumbSize = options.adjustThumbSize ?? false;

    this.on("keyPress", (keyPress) => {
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
    });

    this.on("mousePress", ({ drag, movementX, movementY }) => {
      if (!drag) return;
      this.value = clamp(
        this.value + (this.orientation === "horizontal" ? movementX : movementY) * this.step,
        this.min,
        this.max,
      );
    });
  }

  update(): void {
    super.update();

    const { thumb } = this.drawnObjects;
    if (!thumb) return;

    const { zIndex } = this;
    const style = this.theme.thumb[this.state];
    const horizontal = this.orientation === "horizontal";
    const normalizedValue = normalize(this.value, this.min, this.max);

    thumb.style = style;
    thumb.zIndex = zIndex;

    const { column, row, width, height } = this.rectangle;
    thumb.rectangle.column = horizontal ? column + Math.round((width - 1) * normalizedValue) : column;
    thumb.rectangle.row = horizontal ? row : row + Math.round((height - 1) * normalizedValue);
    thumb.rectangle.width = horizontal ? 1 : width;
    thumb.rectangle.height = horizontal ? height : 1;
  }

  draw(): void {
    super.draw();

    const horizontal = this.orientation === "horizontal";

    const { value } = this;
    const { column, row, width, height } = this.rectangle;

    const thumb = new BoxObject({
      rectangle: {
        column,
        row,
        width: horizontal ? ~~(width * value) : width,
        height: horizontal ? height : ~~(height * value),
      },
      style: this.theme.thumb[this.state],
      zIndex: this.zIndex,
    });

    this.drawnObjects.thumb = thumb;
    this.tui.canvas.drawObjects(thumb);
  }

  interact(method: "keyboard" | "mouse"): void {
    super.interact(method);
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state = this.state === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";
  }
}
