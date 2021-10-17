import { drawPixel } from "./canvas.ts";
import { createComponent } from "./tui.ts";

import type {
  AnyComponent,
  TuiComponent,
  TuiInstance,
  TuiRectangle,
  TuiStyler,
} from "./tui.ts";

export type CreateFrameOptions = {
  focusingItems?: AnyComponent[];
  rectangle: TuiRectangle;
  styler: TuiStyler;
};

export function createFrame(
  object: TuiInstance | AnyComponent,
  options: CreateFrameOptions,
) {
  const { canvas } = object;
  const { column, row, width, height } = options.rectangle;

  const instance = Object.hasOwn(object, "instance")
    ? (<TuiComponent> object).instance
    : object as TuiInstance;

  const frame = createComponent(
    object,
    {
      id: "frame",
      interactive: false,
      canvas: object.canvas,
      styler: options.styler,
      rectangle: options.rectangle,
    },
  );

  frame.draw = () => {
    const items = [...options.focusingItems || [], frame];
    const focused = items.some((item) => instance.components.focused === item);
    const active = focused && instance.components.active;

    const currentStyler =
      (focused
        ? options.styler.focused
        : active
        ? options.styler.active
        : options.styler) || options.styler;

    for (let i = 0; i < width; ++i) {
      drawPixel(canvas, {
        column: column + i,
        row: row,
        value: "─",
        styler: currentStyler,
      });

      drawPixel(canvas, {
        column: column + i,
        row: row + height,
        value: "─",
        styler: currentStyler,
      });
    }

    for (let i = 0; i < height; ++i) {
      drawPixel(canvas, {
        column: column,
        row: row + i,
        value: "│",
        styler: currentStyler,
      });

      drawPixel(canvas, {
        column: column + width,
        row: row + i,
        value: "│",
        styler: currentStyler,
      });
    }

    drawPixel(canvas, {
      column,
      row,
      value: "┌",
      styler: currentStyler,
    });

    drawPixel(canvas, {
      column,
      row: row + height,
      value: "└",
      styler: currentStyler,
    });

    drawPixel(canvas, {
      column: column + width,
      row,
      value: "┐",
      styler: currentStyler,
    });

    drawPixel(canvas, {
      column: column + width,
      row: row + height,
      value: "┘",
      styler: currentStyler,
    });
  };

  instance.on("drawLoop", frame.draw);
  frame.on("redraw", frame.draw);

  return frame;
}
