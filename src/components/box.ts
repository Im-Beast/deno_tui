import { drawPixel } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
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

      const { row, column, width, height } = options.rectangle;

      for (let r = row; r < row + height; ++r) {
        for (let c = column; c < column + width; ++c) {
          drawPixel(object.canvas, {
            column: c,
            row: r,
            value: " ",
            styler,
          });
        }
      }
    },
  });

  return box;
}
