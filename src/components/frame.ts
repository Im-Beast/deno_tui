import { drawPixel, drawText } from "../canvas.ts";
import {
  createComponent,
  ExtendedTuiComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { Dynamic, TuiObject } from "../types.ts";
import { getStaticValue, textPixelWidth } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";

export interface CreateFrameOptions extends CreateBoxOptions {
  label?: Dynamic<string>;
}

export type FrameComponent = ExtendedTuiComponent<"frame", {
  label?: Dynamic<string>;
}>;

export function createFrame(
  object: TuiObject,
  options: CreateFrameOptions,
): FrameComponent {
  const frame: FrameComponent = {
    label: options.label,
    ...createComponent(object, {
      name: "frame",
      interactive: false,
      ...options,
      draw() {
        const styler = getCurrentStyler(frame);
        if (!styler.background && !styler.foreground) return;
        const { row, column, width, height } = getStaticValue(
          frame.rectangle,
        );

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

        if (frame.label && width > 4) {
          let label = getStaticValue(frame.label);

          drawPixel(frame.canvas, {
            column: column + 1,
            row,
            value: "┤",
            styler,
          });

          let textWidth = textPixelWidth(label);
          while (textWidth > width - 3) {
            label = label.slice(0, -1);
            textWidth = textPixelWidth(label);
          }

          drawPixel(frame.canvas, {
            column: column + textWidth + 2,
            row,
            value: "├",
            styler,
          });

          drawText(frame.canvas, {
            column: column + 2,
            row,
            text: label,
            styler: frame.styler,
          });
        }
      },
    }),
  };

  return frame;
}
