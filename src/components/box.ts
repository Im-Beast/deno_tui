import { drawRectangle } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
  getStaticRectangle,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";

export type CreateBoxOptions = Omit<
  CreateComponentOptions,
  "interactive" | "name" | "draw"
>;

export function createBox(object: TuiObject, options: CreateBoxOptions) {
  const box = createComponent(object, {
    name: "box",
    interactive: false,
    ...options,
    draw() {
      const styler = getCurrentStyler(box);
      const { row, column, width, height } = getStaticRectangle(box.rectangle);

      drawRectangle(object.canvas, {
        row,
        column,
        width,
        height,
        styler,
      });
    },
  });

  return box;
}
