import { BoxComponent } from "./box.ts";
import { ComponentOptions } from "../component.ts";
import { DeepPartial, Rectangle } from "../types.ts";
import { Theme } from "../theme.ts";
import { clamp, EventRecord, normalize } from "../util.ts";
import { crayon } from "../deps.ts";
import { ComponentEvent } from "../events.ts";

export interface SliderViewTheme extends Theme {
  thumb: Theme;
}

export interface SliderComponentOptions extends ComponentOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  rectangle: Rectangle;
  direction: "horizontal" | "vertical";
  theme?: DeepPartial<SliderViewTheme>;
}

export type SliderComponentEventMap = {
  valueChange: ComponentEvent<"valueChange", SliderComponent>;
};

// TODO(Im-Beast): Adjust thumb width based on free space
// TODO(Im-Beast): Make step optional and adjust it accordingly on available space and range
export class SliderComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap & SliderComponentEventMap> {
  declare theme: SliderViewTheme;
  direction: "horizontal" | "vertical";
  min: number;
  max: number;
  step: number;
  #value: number;

  constructor(options: SliderComponentOptions) {
    super(options);
    this.direction = options.direction;
    this.min = options.min;
    this.max = options.max;
    this.#value = options.value;
    this.step = options.step;

    this.resetStateAfterInteraction = false;

    const thumb = options.theme?.thumb;
    this.theme.thumb = {
      active: thumb?.active ?? thumb?.focused ?? thumb?.base ?? crayon,
      focused: thumb?.focused ?? thumb?.base ?? crayon,
      base: thumb?.base ?? crayon,
    };

    let lastX = 0;
    let lastY = 0;

    this.tui.addEventListener("mousePress", ({ mousePress }) => {
      const { x, y, drag } = mousePress;

      if (!drag || (this.state !== "active" && this.state !== "focused")) return;

      switch (this.direction) {
        case "horizontal":
          if (lastX === 0) break;
          this.value += (x - lastX) * this.step;
          break;
        case "vertical":
          if (lastY === 0) break;
          this.value += (y - lastY) * this.step;
          break;
      }

      lastX = x;
      lastY = y;
    });
  }

  set value(value) {
    this.#value = clamp(value, this.min, this.max);
    this.dispatchEvent(new ComponentEvent("valueChange", this));
  }

  get value() {
    return this.#value;
  }

  draw() {
    if (this.resetState && this.state === "active") {
      this.state = "focused";
    }

    super.draw();

    const { theme, state, value, min, max } = this;
    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;

    const normalizedValue = normalize(value, min, max);

    const thumbStyle = theme.thumb[state];

    switch (this.direction) {
      case "horizontal":
        for (let r = row; r < row + height; ++r) {
          canvas.draw(
            column + normalizedValue * (width - 1),
            r,
            thumbStyle(" "),
          );
        }
        break;
      case "vertical":
        canvas.draw(
          column,
          row + normalizedValue * (height - 1),
          thumbStyle(" ".repeat(width)),
        );
        break;
    }
  }

  interact() {
    this.state = this.state === "focused" || this.state === "active" ? "active" : "focused";
  }
}
