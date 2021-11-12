import { drawPixel } from "../canvas.ts";
import { createComponent, getCurrentStyler } from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { CreateBoxOptions } from "./box.ts";

export type CreateFrameOptions = CreateBoxOptions;

export function createFrame(object: TuiObject, options: CreateFrameOptions) {
  const frame = createComponent(object, {
    name: "frame",
    interactive: false,
    ...options,
    draw() {
      const styler = getCurrentStyler(frame);
      if (!styler.background && !styler.foreground) return;
      const { row, column, width, height } = frame.staticRectangle;

      for (let w = 0; w < width; ++w) {
        drawPixel(frame.canvas, {
          column: column + w,
          row: row,
          value: "─",
          styler,
        });

        drawPixel(frame.canvas, {
          column: column + w,
          row: row + height,
          value: "─",
          styler,
        });
      }

      for (let h = 0; h < height; ++h) {
        drawPixel(frame.canvas, {
          column: column,
          row: row + h,
          value: "│",
          styler,
        });

        drawPixel(frame.canvas, {
          column: column + width,
          row: row + h,
          value: "│",
          styler,
        });
      }

      drawPixel(frame.canvas, {
        column,
        row,
        value: "┌",
        styler,
      });

      drawPixel(frame.canvas, {
        column,
        row: row + height,
        value: "└",
        styler,
      });

      drawPixel(frame.canvas, {
        column: column + width,
        row,
        value: "┐",
        styler,
      });

      drawPixel(frame.canvas, {
        column: column + width,
        row: row + height,
        value: "┘",
        styler,
      });
    },
  });

  return frame;
}
