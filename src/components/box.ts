// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { drawRectangle } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
  removeComponent,
  TuiComponent,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createFrame, FrameComponent } from "./frame.ts";

/** Not interactive box component */
export type BoxComponent = TuiComponent<"box">;

export type CreateBoxOptions = Omit<
  CreateComponentOptions,
  "interactive" | "name" | "draw"
>;

/**
 * Create BoxComponent
 * It is not interactive by default
 * @param object - parent of the created box, either Tui instance or other component
 * @param options
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
      const styler = getStaticValue(box.styler);
      if (!frame && styler.frame) {
        frame = createFrame(box, {
          ...options,
          label: styler.frame.label,
          rectangle() {
            const rectangle = getStaticValue(box.rectangle);
            return {
              column: rectangle.column - 1,
              row: rectangle.row - 1,
              width: rectangle.width + 1,
              height: rectangle.height + 1,
            };
          },
          styler() {
            const styler = getStaticValue(box.styler);

            if (frame && !styler.frame) {
              removeComponent(frame);
              frame = undefined;
            }

            return styler.frame || {};
          },
          focusedWithin: [box, ...box.focusedWithin],
        });
      }

      drawRectangle(object.canvas, {
        ...getStaticValue(box.rectangle),
        styler: getCurrentStyler(box),
      });
    },
  });

  return box;
}
