import { createComponent } from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { createBox, CreateBoxOptions } from "./box.ts";
import { createFrame } from "./frame.ts";
import { createLabel, TextAlign } from "./label.ts";

export interface CreateButtonOptions extends CreateBoxOptions {
  text?: string | (() => string);
  textAlign?: TextAlign;
  interactive?: boolean;
}

export function createButton(object: TuiObject, options: CreateButtonOptions) {
  const button = createComponent(object, {
    name: "button",
    interactive: typeof options.interactive === "boolean"
      ? options.interactive
      : true,
    draw() {
      for (const { draw } of button.children) {
        draw();
      }
    },
    ...options,
  });

  const focusedWithin = [button, ...(options.focusedWithin || [])];

  createBox(button, {
    ...options,
    focusedWithin,
  });

  if (options.styler.border) {
    const { row, column, width, height } = options.rectangle;

    createFrame(button, {
      ...options,
      rectangle: {
        column: column - 1,
        row: row - 1,
        width: width + 1,
        height: height + 1,
      },
      styler: options.styler.border,
      focusedWithin,
    });
  }

  if (options.text) {
    createLabel(button, {
      text: options.text,
      rectangle: options.rectangle,
      textAlign: options.textAlign || {
        horizontal: "center",
        vertical: "center",
      },
      styler: options.styler,
      focusedWithin,
    });
  }

  return button;
}
