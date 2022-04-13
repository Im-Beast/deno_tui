// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { CanvasStyler, CompileStyler, drawRectangle } from "../canvas.ts";
import { TuiStyler } from "../tui.ts";
import {
  createComponent,
  ExtendedComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { cloneAndAssign } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";

/** Definition on how ProgressBarComponent should look like */
export type ProgressBarStyler = TuiStyler<{
  progress?: CanvasStyler;
}>;

/** Not interactive progress bar component */
export interface ProgressBarExtension {
  /** Whether progress bar is rendered as horizontal or vertical one */
  direction: "vertical" | "horizontal";
  /** ProgressBar progress  */
  value: number;
  /** Definition on how component looks like */
  styler?: CompileStyler<ProgressBarStyler>;
}

/** Interactive button component */
export type ProgressBarComponent = ExtendedComponent<
  "progressBar",
  ProgressBarExtension
>;

export type CreateProgressBarOptions =
  & Omit<CreateBoxOptions, "styler">
  & ProgressBarExtension;

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
 * createProgressBar(tui, {
 *  rectangle: {
 *    column: 2,
 *    row: 2,
 *    width: 10,
 *    height: 5
 *  },
 *  direction: "horizontal",
 *  value: 0.3,
 * });
 * ```
 */
export function createProgressBar(
  parent: TuiObject,
  options: CreateProgressBarOptions,
): ProgressBarComponent {
  let value = options.value;
  const progressBar: ProgressBarComponent = createComponent(
    parent,
    cloneAndAssign<
      Parameters<typeof createComponent>[1],
      CreateProgressBarOptions
    >(
      {
        name: "progressBar",
        interactive: false,

        draw(this: ProgressBarComponent) {
          const { canvas, rectangle } = this;
          const styler = getCurrentStyler(this);

          drawRectangle(canvas, {
            ...rectangle,
            styler,
          });

          const progress = this.value;

          if (this.direction === "horizontal") {
            drawRectangle(canvas, {
              column: rectangle.column,
              row: rectangle.row,
              height: rectangle.height,
              width: Math.round(progress * rectangle.width),
              styler: styler.progress,
            });
          } else {
            drawRectangle(canvas, {
              column: rectangle.column,
              row: rectangle.row,
              height: Math.round(progress * rectangle.height),
              width: rectangle.width,
              styler: styler.progress,
            });
          }
        },
      },
      cloneAndAssign<
        CreateProgressBarOptions,
        Omit<CreateProgressBarOptions, "direction">
      >(options, {
        set value(v) {
          if (v > 1 || v < 0) {
            throw new Error(
              "ProgressBar progress value needs to be within 0 and 1!",
            );
          }
          value = v;
        },
        get value() {
          return value;
        },
      }),
    ),
  );

  return progressBar;
}
