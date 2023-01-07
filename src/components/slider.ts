// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { hierarchizeTheme, Theme } from "../theme.ts";
import { Box } from "./box.ts";

import { PlaceComponentOptions } from "../component.ts";
import { EmitterEvent } from "../event_emitter.ts";

import { clamp, normalize } from "../utils/numbers.ts";

import type { DeepPartial } from "../types.ts";
import type { EventRecord } from "../event_emitter.ts";

/** Theme used by {Slider} to style itself */
export interface SliderTheme extends Theme {
  thumb: Theme;
}

/** Interface defining object that {Slider}'s constructor can interpret */
export interface SliderOptions extends PlaceComponentOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  direction: "horizontal" | "vertical";
  adjustThumbSize?: boolean;
  theme?: DeepPartial<SliderTheme>;
}

/** Complementary interface defining what's accessible in {ScrollableViewComponent} class in addition to {SliderOptions} */
export interface SliderPrivate {
  adjustThumbSize: boolean;
  theme: SliderTheme;
}

/** Implementation for {Slider} class */
export type SliderImplementation = SliderOptions & SliderPrivate;

/** EventMap that {Slider} uses */
export type SliderEventMap = {
  valueChange: EmitterEvent<[Slider<EventRecord>]>;
};

/** Component that allows user to input number by sliding a handle */
export class Slider<
  EventMap extends EventRecord = Record<never, never>,
> extends Box<EventMap & SliderEventMap> implements SliderImplementation {
  declare theme: SliderTheme;

  direction: "horizontal" | "vertical";
  min: number;
  max: number;
  step: number;
  #value: number;
  adjustThumbSize: boolean;

  constructor(options: SliderOptions) {
    super(options);

    this.direction = options.direction;
    this.min = options.min;
    this.max = options.max;
    this.#value = options.value;
    this.step = options.step;
    this.theme.thumb = hierarchizeTheme(options.theme?.thumb);
    this.adjustThumbSize = options.adjustThumbSize ?? false;

    const lastMove = { x: -1, y: -1, time: 0 };
    this.on("keyPress", ({ key, ctrl, meta, shift }) => {
      if (ctrl || meta || shift) return;

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

    this.on("mousePress", ({ x, y, drag }) => {
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

  get value(): number {
    return this.#value;
  }

  set value(value) {
    const prev = this.#value;
    this.#value = clamp(value, this.min, this.max);

    if (this.#value !== prev) {
      this.emit("valueChange", this);
    }
  }

  draw(): void {
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

          canvas.drawText({
            rectangle: {
              column: Math.round(column + normalizedValue * (width - thumbWidth)),
              row,
            },
            style: thumbStyle,
            value: (" ".repeat(Math.max(thumbWidth, 1)) + "\n").repeat(height),
          });
        }
        break;
      case "vertical":
        {
          const thumbHeight = this.adjustThumbSize ? ~~((height - 1) / (max - min)) : 1;

          canvas.drawText({
            rectangle: {
              column,
              row: Math.round(row + normalizedValue * (height - thumbHeight)),
            },
            style: thumbStyle,
            value: (" ".repeat(width) + "\n").repeat(Math.max(thumbHeight, 1)),
          });
        }
        break;
    }
  }

  interact(): void {
    this.state = (this.state === "focused" || this.state === "active") ? "active" : "focused";
  }
}
