import { createBox } from "./box.ts";
import { createFrame } from "./frame.ts";
import { createLabel } from "./label.ts";

import {
  createComponent,
  TuiComponent,
  TuiInstance,
  TuiRectangle,
  TuiStyler,
} from "./tui.ts";

export type CreateButtonOptions = {
  text?: string;
  styler: TuiStyler;
  rectangle: TuiRectangle;
};

export function createButton(
  object: TuiInstance | TuiComponent,
  options: CreateButtonOptions,
) {
  const { row, column, width, height } = options.rectangle;

  const instance = Object.hasOwn(object, "instance")
    ? (<TuiComponent> object).instance
    : object as TuiInstance;

  const button = createComponent(
    object,
    {
      id: "button",
      canvas: object.canvas,
      rectangle: options.rectangle,
      styler: options.styler,
    },
  );

  const funcs: (() => void)[] = [];

  const box = createBox(button, {
    rectangle: options.rectangle,
    styler: options.styler,
  });

  funcs.push(box.draw);

  if (options.styler?.border) {
    const border = createFrame(
      button,
      {
        rectangle: {
          column: column - 1,
          row: row - 1,
          width: width + 1,
          height: height + 1,
        },
        styler: options.styler.border,
      },
    );

    funcs.push(border.draw);
  }

  if (options.text) {
    const label = createLabel(
      button,
      options.text,
      {
        rectangle: options.rectangle,
        align: { horizontal: "middle", vertical: "middle" },
        styler: options.styler,
      },
    );

    funcs.push(label.draw);
  }

  button.draw = () => {
    funcs.forEach((func) => func());
  };

  instance.on("drawLoop", button.draw);
  button.on("redraw", button.draw);

  return button;
}
