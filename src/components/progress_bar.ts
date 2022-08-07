import { BoxComponent } from "./box.ts";
import { ComponentOptions } from "../component.ts";
import { DeepPartial, Rectangle } from "../types.ts";
import { Theme } from "../theme.ts";
import { crayon } from "../deps.ts";
import { ComponentEvent } from "../events.ts";
import { EventRecord } from "../utils/typed_event_target.ts";
import { clamp, normalize } from "../utils/numbers.ts";

export const horizontalSmoothProgressChars = ["█", "▉", "▉", "▊", "▋", "▍", "▎", "▏"] as const;
export const verticalSmoothProgressChars = ["█", "🮆", "🮅", "🮄", "🮃", "🮂", "▔"] as const;

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
  smooth?: boolean;
}

export type ProgressBarComponentEventMap = {
  valueChange: ComponentEvent<"valueChange", ProgressBarComponent>;
};

export class ProgressBarComponent<EventMap extends EventRecord = Record<never, never>>
  extends BoxComponent<EventMap & ProgressBarComponentEventMap> {
  #value: number;

  declare theme: ProgressBarTheme;
  direction: "horizontal" | "vertical";
  min: number;
  max: number;
  smooth: boolean;

  constructor(options: ProgressBarComponentOptions) {
    super(options);
    this.direction = options.direction;
    this.min = options.min;
    this.max = options.max;
    this.#value = options.value;
    this.smooth = options.smooth ?? false;

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

    let valueString: string;

    if (this.smooth) {
      valueString = "";

      const vertical = direction === "vertical";
      const charMap = vertical ? verticalSmoothProgressChars : horizontalSmoothProgressChars;

      main:
      for (let i = normalizedValue * (vertical ? height : width); i > 0;) {
        for (const [j, char] of charMap.entries()) {
          const step = (8 - j) / 8;

          if (i - step > 0) {
            valueString += vertical ? char.repeat(width) + "\n" : char;
            i -= step;
            continue main;
          }
        }

        i = 0;
      }
    }

    switch (direction) {
      case "horizontal":
        {
          valueString ??= " ".repeat(normalizedValue * width);
          canvas.draw(
            column,
            row,
            progressStyle((valueString + "\n").repeat(height)),
          );
        }
        break;
      case "vertical":
        {
          valueString ??= (" ".repeat(width) + "\n").repeat(normalizedValue * height);
          canvas.draw(
            column,
            row,
            progressStyle(valueString),
          );
        }
        break;
    }
  }

  interact() {
    this.state = this.state === "focused" || this.state === "active" ? "active" : "focused";
  }
}
