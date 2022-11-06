// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { hierarchizeTheme, Theme } from "../theme.ts";

import { PlaceComponentOptions } from "../component.ts";
import { BoxComponent } from "./box.ts";
import { EmitterEvent } from "../event_emitter.ts";

import { clamp, normalize } from "../utils/numbers.ts";

import type { DeepPartial } from "../types.ts";
import type { EventRecord } from "../event_emitter.ts";

/** Theme used by {SliderComponent} to style itself */
export interface SliderTheme extends Theme {
  thumb: Theme;
}

/** Interface defining object that {SliderComponent}'s constructor can interpret */
export interface SliderComponentOptions extends PlaceComponentOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  direction: "horizontal" | "vertical";
  adjustThumbSize?: boolean;
  theme?: DeepPartial<SliderTheme>;
}

/** Complementary interface defining what's accessible in {ScrollableViewComponent} class in addition to {SliderComponentOptions} */
export interface SliderComponentPrivate {
  adjustThumbSize: boolean;
  theme: SliderTheme;
}

/** Implementation for {SliderComponent} class */
export type SliderComponentImplementation = SliderComponentOptions & SliderComponentPrivate;

/** EventMap that {SliderComponent} uses */
export type SliderComponentEventMap = {
  valueChange: EmitterEvent<[SliderComponent<EventRecord>]>;
};

/** Component that allows user to input number by sliding a handle */
export class SliderComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap & SliderComponentEventMap> implements SliderComponentImplementation {
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
    this.theme.thumb = hierarchizeTheme(options.theme?.thumb ?? {});
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

          canvas.draw(
            column + normalizedValue * (width - thumbWidth),
            row,
            thumbStyle((" ".repeat(Math.max(thumbWidth, 1)) + "\n").repeat(height)),
          );
        }
        break;
      case "vertical":
        {
          const thumbHeight = this.adjustThumbSize ? ~~((height - 1) / (max - min)) : 1;

          canvas.draw(
            column,
            row + normalizedValue * (height - thumbHeight),
            thumbStyle((" ".repeat(width) + "\n").repeat(Math.max(thumbHeight, 1))),
          );
        }
        break;
    }
  }

  interact(): void {
    this.state = (this.state === "focused" || this.state === "active") ? "active" : "focused";
  }
}
