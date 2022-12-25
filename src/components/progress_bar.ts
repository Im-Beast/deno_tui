// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { hierarchizeTheme, Theme } from "../theme.ts";
import { PlaceComponentOptions } from "../component.ts";
import { Box } from "./box.ts";
import { EmitterEvent } from "../event_emitter.ts";

import { clamp, normalize } from "../utils/numbers.ts";

import type { DeepPartial } from "../types.ts";
import type { EventRecord } from "../event_emitter.ts";

export const horizontalSmoothProgressChars = ["█", "▉", "▉", "▊", "▋", "▍", "▎", "▏"] as const;
export const verticalSmoothProgressChars = ["█", "🮆", "🮅", "🮄", "🮃", "🮂", "▔"] as const;

/** Theme used by {ProgressBar} to style itself */
export interface ProgressBarTheme extends Theme {
  progress: Theme;
}

/** Interface defining object that {ProgressBar}'s constructor can interpret */
export interface ProgressBarOptions extends PlaceComponentOptions {
  theme?: DeepPartial<ProgressBarTheme>;
  /** Current value */
  value: number;
  /** Minimal value of {ProgressBar} */
  min: number;
  /** Maximal value of {ProgressBar} */
  max: number;
  /** Whether {ProgressBar} is vertical or horizontal */
  direction: "horizontal" | "vertical";
  /**
   * Whether {ProgressBar} should use UNICODE characters to create effect of more gradual, smooth looking progress
   * Keep in mind that not every terminal might support used characters
   */
  smooth?: boolean;
}

/** Complementary interface defining what's accessible in {ProgressBar} class in addition to {ProgressBarOptions} */
export interface ProgressBarPrivate {
  theme: ProgressBarTheme;
  smooth: boolean;
}

/** Implementation for {ProgressBar} class */
export type ProgressBarImplementation = ProgressBarOptions & ProgressBarPrivate;

/** EventMap that {ProgressBar} uses */
export type ProgressBarEventMap = {
  valueChange: EmitterEvent<[ProgressBar<EventRecord>]>;
};

/** Component that indicates progress */
export class ProgressBar<
  EventMap extends EventRecord = Record<never, never>,
> extends Box<EventMap & ProgressBarEventMap> implements ProgressBarImplementation {
  declare theme: ProgressBarTheme;

  #value: number;

  direction: "horizontal" | "vertical";
  min: number;
  max: number;
  smooth: boolean;

  constructor(options: ProgressBarOptions) {
    super(options);
    this.direction = options.direction;
    this.min = options.min;
    this.max = options.max;
    this.#value = options.value;
    this.smooth = options.smooth ?? false;
    this.theme.progress = hierarchizeTheme(options.theme?.progress);
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
            this,
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
            this,
          );
        }
        break;
    }
  }

  interact(): void {
    this.state = this.state === "focused" || this.state === "active" ? "active" : "focused";
  }
}
