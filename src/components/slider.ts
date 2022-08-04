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
  adjustThumbSize?: boolean;
  theme?: DeepPartial<SliderViewTheme>;
}

export type SliderComponentEventMap = {
  valueChange: ComponentEvent<"valueChange", SliderComponent>;
};

export class SliderComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap & SliderComponentEventMap> {
  declare theme: SliderViewTheme;
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
      active: thumb?.active ?? thumb?.focused ?? thumb?.base ?? crayon,
      focused: thumb?.focused ?? thumb?.base ?? crayon,
      base: thumb?.base ?? crayon,
    };

    const lastMove = { x: 0, y: 0 };

    this.tui.addEventListener("mousePress", ({ mousePress }) => {
      const { x, y, drag } = mousePress;

      if (!drag || (this.state !== "active" && this.state !== "focused")) return;

      switch (this.direction) {
        case "horizontal":
          if (lastMove.x === 0) break;
          this.value += (x - lastMove.x) * this.step;
          break;
        case "vertical":
          if (lastMove.y === 0) break;
          this.value += (y - lastMove.y) * this.step;
          break;
      }

      lastMove.x = x;
      lastMove.y = y;
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
            thumbStyle(" ".repeat(thumbWidth)),
          );
        }
        break;
      case "vertical":
        {
          const thumbHeight = this.adjustThumbSize ? ~~((height - 1) / (max - min)) : 1;

          for (let r = 0; r < thumbHeight; ++r) {
            canvas.draw(
              column,
              row + normalizedValue * (height - thumbHeight) + r,
              thumbStyle(" ".repeat(width)),
            );
          }
        }
        break;
    }
  }

  interact() {
    this.state = this.state === "focused" || this.state === "active" ? "active" : "focused";
  }
}
