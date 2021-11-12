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
    interactive: options.interactive,
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
    drawPriority: options.drawPriority,
  });

  if (options.styler.border) {
    createFrame(button, {
      ...options,
      drawPriority: options.drawPriority,
      rectangle: () => ({
        column: button.staticRectangle.column - 1,
        row: button.staticRectangle.row - 1,
        width: button.staticRectangle.width + 1,
        height: button.staticRectangle.height + 1,
      }),
      styler: options.styler.border,
      focusedWithin,
    });
  }

  if (options.text) {
    createLabel(button, {
      drawPriority: (options.drawPriority || 0) + 1,
      text: options.text,
      rectangle: button.rectangle,
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
