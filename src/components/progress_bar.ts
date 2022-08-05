import { BoxComponent } from "./box.ts";
import { ComponentOptions } from "../component.ts";
import { DeepPartial, Rectangle } from "../types.ts";
import { Theme } from "../theme.ts";
import { clamp, EventRecord, normalize } from "../util.ts";
import { crayon } from "../deps.ts";
import { ComponentEvent } from "../events.ts";

export interface ProgressBarTheme extends Theme {
  progress: Theme;
}

export interface ProgressBarComponentOptions extends ComponentOptions {
  value: number;
  min: number;
  max: number;
  rectangle: Rectangle;
  direction: "horizontal" | "vertical";
  theme?: DeepPartial<ProgressBarTheme>;
}

export type ProgressBarComponentEventMap = {
  valueChange: ComponentEvent<"valueChange", ProgressBarComponent>;
};

export class ProgressBarComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap & ProgressBarComponentEventMap> {
  declare theme: ProgressBarTheme;
  direction: "horizontal" | "vertical";
  min: number;
  max: number;
  #value: number;

  constructor(options: ProgressBarComponentOptions) {
    super(options);
    this.direction = options.direction;
    this.min = options.min;
    this.max = options.max;
    this.#value = options.value;

    const progress = options.theme?.progress;
    this.theme.progress = {
      active: progress?.active ?? progress?.focused ?? progress?.base ?? crayon,
      focused: progress?.focused ?? progress?.base ?? crayon,
      base: progress?.base ?? crayon,
    };
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

    const progressStyle = theme.progress[state];

    switch (direction) {
      case "horizontal":
        for (let r = 0; r < height; ++r) {
          canvas.draw(
            column,
            row + r,
            progressStyle(" ".repeat(normalizedValue * width)),
          );
        }
        break;
      case "vertical":
        for (let r = 0; r < normalizedValue * height; ++r) {
          canvas.draw(
            column,
            row + r,
            progressStyle(" ".repeat(width)),
          );
        }
        break;
    }
  }

  interact() {
    this.state = this.state === "focused" || this.state === "active" ? "active" : "focused";
  }
}
