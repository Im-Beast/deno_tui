// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { hierarchizeTheme, Theme } from "../theme.ts";
import { PlaceComponentOptions } from "../component.ts";
import { BoxComponent } from "./box.ts";
import { EmitterEvent } from "../event_emitter.ts";

import { clamp, normalize } from "../utils/numbers.ts";

import type { _any, DeepPartial } from "../types.ts";

export const horizontalSmoothProgressChars = ["█", "▉", "▉", "▊", "▋", "▍", "▎", "▏"] as const;
export const verticalSmoothProgressChars = ["█", "🮆", "🮅", "🮄", "🮃", "🮂", "▔"] as const;

/** Theme used by {ProgressBarComponent} to style itself */
export interface ProgressBarTheme extends Theme {
  progress: Theme;
}

/** Interface defining object that {ProgressBarComponent}'s constructor can interpret */
export interface ProgressBarComponentOptions extends PlaceComponentOptions {
  /** Current value */
  value: number;
  /** Minimal value of {ProgressBarComponent} */
  min: number;
  /** Maximal value of {ProgressBarComponent} */
  max: number;
  /** Whether {ProgressBarComponent} is vertical or horizontal */
  direction: "horizontal" | "vertical";
  theme?: DeepPartial<ProgressBarTheme>;
  /**
   * Whether {ProgressBarComponent} should use UNICODE characters to create effect of more gradual, smooth looking progress
   * Keep in mind that not every terminal might support used characters
   */
  smooth?: boolean;
}

/** Complementary interface defining what's accessible in {ProgressBarComponent} class in addition to {ProgressBarComponentOptions} */
export interface ProgressBarComponentPrivate {
  theme: ProgressBarTheme;
  smooth: boolean;
}

/** Implementation for {ProgressBarComponent} class */
export type ProgressBarComponentImplementation = ProgressBarComponentOptions & ProgressBarComponentPrivate;

/** EventMap that {ProgressBarComponent} uses */
export type ProgressBarComponentEventMap = {
  valueChange: EmitterEvent<[ProgressBarComponent<_any>]>;
};

/** Component that indicates progress */
export class ProgressBarComponent<
  EventMap extends Record<string, EmitterEvent> = Record<never, never>,
> extends BoxComponent<EventMap & ProgressBarComponentEventMap> implements ProgressBarComponentImplementation {
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
    this.theme.progress = hierarchizeTheme(options.theme?.progress ?? {});
  }

  get value() {
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

  interact(): void {
    this.state = this.state === "focused" || this.state === "active" ? "active" : "focused";
  }
}
