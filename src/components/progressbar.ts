// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Box } from "./box.ts";
import { Theme } from "../theme.ts";
import { ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";
import { TextObject } from "../canvas/text.ts";

import { normalize } from "../utils/numbers.ts";

import type { DeepPartial } from "../types.ts";
import { BaseSignal, Computed } from "../signals.ts";
import { signalify } from "../utils/signals.ts";

export type ProgressBarCharMapType = {
  vertical: string[];
  horizontal: string[];
};

export const progressBarCharMap: ProgressBarCharMapType = {
  vertical: ["█", "🮆", "🮅", "🮄", "🮃", "🮂", "▔"],
  horizontal: ["█", "▉", "▉", "▊", "▋", "▍", "▎", "▏"],
};

export type ProgressBarOrientation = "vertical" | "horizontal";
export type ProgressBarDirection = "normal" | "reversed";

export interface ProgressBarTheme extends Theme {
  progress: Theme;
}

export interface ProgressBarOptions extends ComponentOptions {
  min: number | BaseSignal<number>;
  max: number | BaseSignal<number>;
  value: number | BaseSignal<number>;
  smooth: boolean | BaseSignal<boolean>;
  direction: ProgressBarDirection | BaseSignal<ProgressBarDirection>;
  charMap?: ProgressBarCharMapType | BaseSignal<ProgressBarCharMapType>;
  orientation: ProgressBarOrientation | BaseSignal<ProgressBarOrientation>;

  theme: DeepPartial<ProgressBarTheme, "progress">;
}

export class ProgressBar extends Box {
  declare drawnObjects: { box: BoxObject; progress: BoxObject | TextObject[] };
  declare theme: ProgressBarTheme;

  min: BaseSignal<number>;
  max: BaseSignal<number>;
  value: BaseSignal<number>;
  smooth: BaseSignal<boolean>;
  direction: BaseSignal<ProgressBarDirection>;
  orientation: BaseSignal<ProgressBarOrientation>;
  charMap: BaseSignal<ProgressBarCharMapType>;

  constructor(options: ProgressBarOptions) {
    super(options);

    const { min, max, value, smooth, direction, orientation, charMap } = options;
    this.min = signalify(min);
    this.max = signalify(max);
    this.value = signalify(value);
    this.smooth = signalify(smooth);
    this.direction = signalify(direction);
    this.orientation = signalify(orientation);
    this.charMap = signalify(charMap ?? progressBarCharMap);
  }

  draw(): void {
    super.draw();

    if (this.smooth) {
      this.drawnObjects.progress = [];
      this.#fillSmoothDrawObjects();
    } else {
      const progressRectangle = { column: 0, row: 0, width: 0, height: 0 };
      const progress = new BoxObject({
        canvas: this.tui.canvas,
        view: this.view,
        zIndex: this.zIndex,
        style: new Computed(() => this.theme.progress[this.state.value]),
        rectangle: new Computed(() => {
          let normalizedValue = normalize(this.value.value, this.min.value, this.max.value);
          if (this.direction.value === "reversed") normalizedValue = 1 - normalizedValue;

          const { column, row, width, height } = this.rectangle.value;
          progressRectangle.column = column;
          progressRectangle.row = row;

          if (this.orientation.value === "horizontal") {
            progressRectangle.width = Math.round(width * normalizedValue);
            progressRectangle.height = height;
          } else {
            progressRectangle.width = width;
            progressRectangle.height = Math.round(height * normalizedValue);
          }

          const { progress } = this.drawnObjects;
          if (Array.isArray(progress)) {
            if (progress.length > height) {
              this.#popUnusedSmoothDrawObjects();
            } else if (progress.length < height) {
              this.#fillSmoothDrawObjects();
            }
          }

          return progressRectangle;
        }),
      });

      this.drawnObjects.progress = progress;
      progress.draw();
    }
  }

  interact(method: "mouse" | "keyboard"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state.value = this.state.peek() === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }

  #fillSmoothDrawObjects() {
    if (!Array.isArray(this.drawnObjects.progress)) {
      throw "drawnObjects.progress needs to be an array";
    }

    for (let offset = this.drawnObjects.progress.length; offset < this.rectangle.peek().height; ++offset) {
      const progressLineRectangle = { column: 0, row: 0 };
      const progressLine = new TextObject({
        canvas: this.tui.canvas,
        multiCodePointSupport: true,
        view: this.view,
        zIndex: this.zIndex,
        style: new Computed(() => this.theme.progress[this.state.value]),
        rectangle: new Computed(() => {
          const { column, row } = this.rectangle.value;
          progressLineRectangle.column = column;
          progressLineRectangle.row = row + offset;
          return progressLineRectangle;
        }),
        value: new Computed(() => {
          let normalizedValue = normalize(this.value.value, this.min.value, this.max.value);
          if (this.direction.value === "reversed") normalizedValue = 1 - normalizedValue;

          const charMap = this.charMap.value[this.orientation.value];
          const step = 1 / (charMap.length);

          const { width, height } = this.rectangle.value;

          if (this.orientation.value === "horizontal") {
            const steps = normalizedValue * width;
            const remainder = steps % 1;
            return charMap[0].repeat(steps) +
              (
                remainder < step ? "" : charMap[charMap.length - Math.max(Math.round(remainder / step), 1)]
              );
          } else {
            const steps = normalizedValue * height;

            const remainder = steps % 1;

            if (offset - 1 >= steps - remainder) {
              return "";
            } else if (offset < steps - remainder) {
              return charMap[0].repeat(width);
            } else {
              return remainder < step
                ? ""
                : charMap[charMap.length - Math.max(Math.round(remainder / step), 1)].repeat(width);
            }
          }
        }),
      });

      this.drawnObjects.progress.push(progressLine);
      progressLine.draw();
    }
  }

  #popUnusedSmoothDrawObjects(): void {
    if (!Array.isArray(this.drawnObjects.progress)) {
      throw "drawnObjects.progress needs to be an array";
    }

    for (const progressLine of this.drawnObjects.progress.splice(this.rectangle.peek().height)) {
      progressLine.erase();
    }
  }
}
