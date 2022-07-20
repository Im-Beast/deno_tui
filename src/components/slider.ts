import { BoxComponent } from "./box.ts";
import { ComponentEventMap, ComponentOptions, ComponentState } from "../component.ts";
import { DeepPartial, Rectangle } from "../types.ts";
import { Theme } from "../theme.ts";
import { clamp, normalize } from "../util.ts";
import { crayon } from "../deps.ts";

export interface ScrollableViewTheme extends Theme {
  thumb: Theme;
}

export interface SliderComponentOptions extends ComponentOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  rectangle: Rectangle;
  direction: "horizontal" | "vertical";
  theme?: DeepPartial<ScrollableViewTheme>;
}

export type TextboxComponentEventMap = ComponentEventMap<{
  value: string;
  state: ComponentState;
}>;

export class SliderComponent<
  EventMap extends ComponentEventMap = ComponentEventMap,
> extends BoxComponent<EventMap> {
  declare theme: ScrollableViewTheme;
  direction: "horizontal" | "vertical";
  min: number;
  max: number;
  value: number;
  step: number;

  constructor(options: SliderComponentOptions) {
    super(options);
    this.direction = options.direction;
    this.min = options.min;
    this.max = options.max;
    this.value = options.value;
    this.step = options.step;

    const thumb = options.theme?.thumb;
    this.theme.thumb = {
      active: thumb?.active ?? thumb?.focused ?? thumb?.base ?? crayon,
      focused: thumb?.focused ?? thumb?.base ?? crayon,
      base: thumb?.base ?? crayon,
    };

    let lastX = 0;
    let lastY = 0;
    this.tui.addEventListener("mousePress", ({ detail: { x, y, drag } }) => {
      if (!drag || this.state !== "active") return;

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
      this.value = clamp(this.value, this.min, this.max);
    });
  }

  draw() {
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
    const { state } = this;
    this.state = state === "focused" || state === "active" ? "active" : "focused";
  }
}
