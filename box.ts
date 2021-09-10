import { drawPixel } from "./canvas.ts";
import { AnyComponent, createComponent } from "./tui.ts";

import type {
  TuiComponent,
  TuiInstance,
  TuiRectangle,
  TuiStyler,
} from "./tui.ts";

export type CreateBoxOptions = {
  rectangle: TuiRectangle;
  styler: TuiStyler;
};

export function createBox(
  object: TuiInstance | AnyComponent,
  options: CreateBoxOptions,
) {
  const { row, column, width, height } = options.rectangle;

  const instance = Object.hasOwn(object, "instance")
    ? (<TuiComponent> object).instance
    : object as TuiInstance;

  const box = createComponent(
    object,
    {
      id: "box",
      canvas: object.canvas,
      styler: options.styler,
      rectangle: options.rectangle,
    },
  );

  box.draw = () => {
    const focused = instance.components.focused === box;
    const active = focused && instance.components.active;

    const currentStyler =
      (focused
        ? options.styler.focused
        : active
        ? options.styler.active
        : options.styler) || options.styler;

    for (let r = row; r < row + height; ++r) {
      for (let c = column; c < column + width; ++c) {
        drawPixel(object.canvas, {
          column: c,
          row: r,
          value: " ",
          styler: currentStyler,
        });
      }
    }
  };

  instance.on("drawLoop", box.draw);
  box.on("redraw", box.draw);

  return box;
}
