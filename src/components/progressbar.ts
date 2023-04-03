import { Box } from "./box.ts";
import { Theme } from "../theme.ts";
import { ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";
import { TextObject } from "../canvas/text.ts";

import { normalize } from "../utils/numbers.ts";

import type { DeepPartial } from "../types.ts";

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
  min: number;
  max: number;
  value: number;
  smooth: boolean;
  direction: ProgressBarDirection;
  orientation: ProgressBarOrientation;
  theme: DeepPartial<ProgressBarTheme, "progress">;
  charMap?: ProgressBarCharMapType;
}

export class ProgressBar extends Box {
  declare drawnObjects: { box: BoxObject; progress: BoxObject | TextObject[] };
  declare theme: ProgressBarTheme;

  min: number;
  max: number;
  value: number;
  smooth: boolean;
  direction: ProgressBarDirection;
  orientation: ProgressBarOrientation;
  charMap: ProgressBarCharMapType;

  constructor(options: ProgressBarOptions) {
    super(options);
    this.smooth = options.smooth;
    this.min = options.min;
    this.max = options.max;
    this.value = options.value ?? 0;
    this.direction = options.direction;
    this.orientation = options.orientation;
    this.charMap = options.charMap ?? progressBarCharMap;
  }

  update(): void {
    super.update();

    const { progress } = this.drawnObjects;
    if (!Array.isArray(progress)) return;

    if (progress.length > this.rectangle.height) {
      this.#popUnusedSmoothDrawObjects();
    } else if (progress.length < this.rectangle.height) {
      this.#fillSmoothDrawObjects();
    }
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
        zIndex: () => this.zIndex,
        style: () => this.theme.progress[this.state],
        rectangle: () => {
          let normalizedValue = normalize(this.value, this.min, this.max);
          if (this.direction === "reversed") normalizedValue = 1 - normalizedValue;

          const { column, row, width, height } = this.rectangle;
          progressRectangle.column = column;
          progressRectangle.row = row;

          if (this.orientation === "horizontal") {
            progressRectangle.width = Math.round(width * normalizedValue);
            progressRectangle.height = height;
          } else {
            progressRectangle.width = width;
            progressRectangle.height = Math.round(height * normalizedValue);
          }

          return progressRectangle;
        },
      });

      this.drawnObjects.progress = progress;
      progress.draw();
    }
  }

  interact(method: "mouse" | "keyboard"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state = this.state === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }

  #fillSmoothDrawObjects() {
    if (!Array.isArray(this.drawnObjects.progress)) {
      throw "drawnObjects.progress needs to be an array";
    }

    for (let offset = this.drawnObjects.progress.length; offset < this.rectangle.height; ++offset) {
      const progressLineRectangle = { column: 0, row: 0 };
      const progressLine = new TextObject({
        canvas: this.tui.canvas,
        multiCodePointSupport: true,
        zIndex: () => this.zIndex,
        style: () => this.theme.progress[this.state],
        rectangle: () => {
          const { column, row } = this.rectangle;
          progressLineRectangle.column = column;
          progressLineRectangle.row = row + offset;
          return progressLineRectangle;
        },
        value: () => {
          let normalizedValue = normalize(this.value, this.min, this.max);
          if (this.direction === "reversed") normalizedValue = 1 - normalizedValue;

          const charMap = this.charMap[this.orientation];
          const step = 1 / (charMap.length);

          if (this.orientation === "horizontal") {
            const steps = normalizedValue * this.rectangle.width;
            const remainder = steps % 1;
            return charMap[0].repeat(steps) +
              (
                remainder < step ? "" : charMap[charMap.length - Math.max(Math.round(remainder / step), 1)]
              );
          } else {
            const { width, height } = this.rectangle;
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
        },
      });

      this.drawnObjects.progress.push(progressLine);
      progressLine.draw();
    }
  }

  #popUnusedSmoothDrawObjects(): void {
    if (!Array.isArray(this.drawnObjects.progress)) {
      throw "drawnObjects.progress needs to be an array";
    }

    for (const progressLine of this.drawnObjects.progress.splice(this.rectangle.height)) {
      progressLine.erase();
    }
  }
}
