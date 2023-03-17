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
  theme: DeepPartial<ProgressBarTheme>;
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
    if (!progress) return;

    const { direction, zIndex } = this;
    const style = this.theme.progress[this.state];
    const horizontal = this.orientation === "horizontal";
    let normalizedValue = normalize(this.value, this.min, this.max);
    if (direction === "reversed") normalizedValue = 1 - normalizedValue;

    if (Array.isArray(progress)) {
      const { column, row, width, height } = this.rectangle;
      const charMap = this.charMap[this.orientation];
      const step = 1 / (charMap.length);

      if (horizontal) {
        const steps = normalizedValue * width;

        const remainder = steps % 1;

        const stringValue = charMap[0].repeat(steps) +
          (remainder < step ? "" : charMap[charMap.length - Math.max(Math.round(remainder / step), 1)]);

        for (const [i, text] of progress.entries()) {
          text.value = stringValue;
          text.style = style;
          text.zIndex = zIndex;
          text.rectangle.column = column;
          text.rectangle.row = row + i;
        }
      } else {
        const steps = normalizedValue * height;

        const remainder = steps % 1;

        const filled = charMap[0].repeat(width);
        const ending = remainder < step
          ? ""
          : charMap[charMap.length - Math.max(Math.round(remainder / step), 1)].repeat(width);

        let hadEnding = false;
        for (const [i, text] of progress.entries()) {
          if (hadEnding) {
            text.value = "";
          } else if (i < steps - remainder) {
            text.value = filled;
          } else {
            text.value = ending;
            hadEnding = true;
          }

          text.multiCodePointSupport = true;
          text.style = style;
          text.zIndex = zIndex;
          text.rectangle.column = column;
          text.rectangle.row = row + i;
        }
      }
    } else {
      progress.style = style;
      progress.zIndex = zIndex;

      const { column, row, width, height } = this.rectangle;
      progress.rectangle.column = column;
      progress.rectangle.row = row;
      progress.rectangle.width = horizontal ? ~~(width * normalizedValue) : width;
      progress.rectangle.height = horizontal ? height : ~~(height * normalizedValue);
    }
  }

  draw(): void {
    super.draw();

    const horizontal = this.orientation === "horizontal";

    const { value } = this;
    const { column, row, width, height } = this.rectangle;

    if (this.smooth) {
      this.drawnObjects.progress = [];
      for (let r = row; r < row + height; ++r) {
        const progressLine = new TextObject({
          canvas: this.tui.canvas,
          rectangle: {
            column,
            row: r,
          },
          style: this.theme.progress[this.state],
          zIndex: this.zIndex,
          value: "",
        });

        this.drawnObjects.progress.push(progressLine);
        progressLine.draw();
      }
    } else {
      const progress = new BoxObject({
        canvas: this.tui.canvas,
        rectangle: {
          column,
          row,
          width: horizontal ? ~~(width * value) : width,
          height: horizontal ? height : ~~(height * value),
        },
        style: this.theme.progress[this.state],
        zIndex: this.zIndex,
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
}
