// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { CanvasStyler, CompileStyler, drawRectangle } from "../canvas.ts";
import { TuiStyler } from "../tui.ts";
import {
  createComponent,
  ExtendedComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { clamp, cloneAndAssign } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";

/** Definition on how SliderComponent should look like */
export type SliderStyler = TuiStyler<{
  thumb?: CanvasStyler;
}>;

/** Interactive slider component */
export interface SliderExtension {
  /** Whether slider is rendered as horizontal or vertical one */
  direction: "vertical" | "horizontal";
  /** Slider value  */
  value: number;
  /** Value by which slider is incremented/decremented */
  step: number;
  /** Minimal value of the slider */
  min: number;
  /** Maximal value of the slider */
  max: number;
  /** Definition on how component looks like */
  styler?: CompileStyler<SliderStyler>;
}

/** Interactive button component */
export type SliderComponent = ExtendedComponent<
  "slider",
  SliderExtension,
  "valueChange",
  number
>;

export type CreateSliderOptions =
  & Omit<CreateBoxOptions, "styler">
  & SliderExtension;

/**
 * Create ButtonComponent
 *
 * It is interactive by default
 * @param parent - parent of the created button, either tui or other component
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * createSlider(tui, {
 *  rectangle: {
 *    column: 2,
 *    row: 2,
 *    width: 10,
 *    height: 5
 *  },
 *  direction: "horizontal",
 *  min: -5,
 *  max: 5,
 *  value: 0,
 *  step: 0.5,
 * });
 * ```
 */
export function createSlider(
  parent: TuiObject,
  options: CreateSliderOptions,
): SliderComponent {
  const slider: SliderComponent = createComponent(
    parent,
    cloneAndAssign<Parameters<typeof createComponent>[1], CreateSliderOptions>({
      name: "slider",
      interactive: true,

      draw(this: SliderComponent) {
        const { canvas, rectangle } = this;

        drawRectangle(canvas, {
          ...rectangle,
          styler: getCurrentStyler(this),
        });

        const progress = (this.value - this.min) / (this.max - this.min);

        if (this.direction === "horizontal") {
          drawRectangle(canvas, {
            column: rectangle.column + ~~(progress * (rectangle.width - 1)),
            row: rectangle.row,
            height: rectangle.height,
            width: 1,
            styler: getCurrentStyler(this).thumb,
          });
        } else {
          drawRectangle(canvas, {
            column: rectangle.column,
            row: rectangle.row + ~~(progress * (rectangle.height - 1)),
            height: 1,
            width: rectangle.width,
            styler: getCurrentStyler(this).thumb,
          });
        }
      },
    }, options),
  );

  slider.on("key", ({ key, shift }) => {
    if (shift) return;
    const controls = slider.tui.keyboardControls;
    const startValue = slider.value;

    switch (key) {
      case controls.get("down"):
      case controls.get("right"):
        slider.value = Math.min(slider.value + slider.step, slider.max);
        break;
      case controls.get("up"):
      case controls.get("left"):
        slider.value = Math.max(slider.value - slider.step, slider.min);
        break;
    }

    if (slider.value !== startValue) {
      slider.emit("valueChange", startValue);
    }
  });

  let lastDragPos: [number, number, number] | undefined;
  slider.on("mouse", ({ scroll, drag, x, y }) => {
    const startValue = slider.value;

    if (drag) {
      if (!lastDragPos) {
        lastDragPos = [x, y, Date.now()];
        return;
      }

      if (Date.now() - lastDragPos[2] < 100) {
        const diffX = x - lastDragPos[0];
        const diffY = y - lastDragPos[1];

        if (slider.direction === "horizontal") {
          slider.value = clamp(
            slider.value + slider.step * diffX,
            slider.min,
            slider.max,
          );
        } else {
          slider.value = clamp(
            slider.value + slider.step * diffY,
            slider.min,
            slider.max,
          );
        }
      }

      lastDragPos = [x, y, Date.now()];

      if (slider.value !== startValue) {
        slider.emit("valueChange", startValue);
      }
      return;
    }

    slider.value = clamp(
      slider.value + slider.step * scroll,
      slider.min,
      slider.max,
    );

    if (slider.value !== startValue) {
      slider.emit("valueChange", startValue);
    }
  });

  return slider;
}
