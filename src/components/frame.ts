import { drawPixel } from "../canvas.ts";
import { createComponent, getCurrentStyler } from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { CreateBoxOptions } from "./box.ts";

export type CreateFrameOptions = CreateBoxOptions;

export function createFrame(object: TuiObject, options: CreateFrameOptions) {
  const { row, column, width, height } = options.rectangle;
  const { canvas } = object;

  const frame = createComponent(object, {
    name: "frame",
    interactive: false,
    ...options,
    draw() {
      const styler = getCurrentStyler(frame);

      for (let w = 0; w < width; ++w) {
        drawPixel(canvas, {
          column: column + w,
          row: row,
          value: "─",
          styler,
        });

        drawPixel(canvas, {
          column: column + w,
          row: row + height,
          value: "─",
          styler,
        });
      }

      for (let h = 0; h < height; ++h) {
        drawPixel(canvas, {
          column: column,
          row: row + h,
          value: "│",
          styler,
        });

        drawPixel(canvas, {
          column: column + width,
          row: row + h,
          value: "│",
          styler,
        });
      }

      drawPixel(canvas, {
        column,
        row,
        value: "┌",
        styler,
      });

      drawPixel(canvas, {
        column,
        row: row + height,
        value: "└",
        styler,
      });

      drawPixel(canvas, {
        column: column + width,
        row,
        value: "┐",
        styler,
      });

      drawPixel(canvas, {
        column: column + width,
        row: row + height,
        value: "┘",
        styler,
      });
    },
  });

  return frame;
}
