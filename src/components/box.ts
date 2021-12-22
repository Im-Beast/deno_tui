// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { drawRectangle } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
  TuiComponent,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { createFrame, FrameComponent } from "./frame.ts";

/** Not interactive box component */
export type BoxComponent = TuiComponent<"box">;

export type CreateBoxOptions = Omit<
  CreateComponentOptions,
  "interactive" | "name" | "draw"
>;

/**
 * Create BoxComponent
 *
 * It is not interactive by default
 * @param object - parent of the created box, either Tui instance or other component
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * createBox(tui, {
 *  rectangle: {
 *    column: 2,
 *    row: 2,
 *    width: 10,
 *    height: 5
 *  }
 * })
 * ```
 */
export function createBox(
  object: TuiObject,
  options: CreateBoxOptions,
): BoxComponent {
  let frame: FrameComponent | undefined;

  const box = createComponent(object, {
    name: "box",
    interactive: false,
    ...options,
    draw() {
      const styler = box.styler;
      if (!frame && styler.frame) {
        frame = createFrame(box, {
          ...options,
          label: styler.frame.label,
          get rectangle() {
            const { column, row, width, height } = box.rectangle;
            return {
              column: column - 1,
              row: row - 1,
              width: width + 1,
              height: height + 1,
            };
          },
          styler: box.styler?.frame,
          focusedWithin: [box, ...box.focusedWithin],
        });
      }

      drawRectangle(object.canvas, {
        ...box.rectangle,
        styler: getCurrentStyler(box),
      });
    },
  });

  return box;
}
