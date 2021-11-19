import { createComponent, ExtendedTuiComponent } from "../tui_component.ts";
import { Dynamic, TextAlign, TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createBox, CreateBoxOptions } from "./box.ts";
import { createFrame } from "./frame.ts";
import { createLabel } from "./label.ts";

export type ButtonComponent = ExtendedTuiComponent<"button", {
  text?: Dynamic<string>;
  textAlign?: Dynamic<TextAlign>;
}>;

export interface CreateButtonOptions extends CreateBoxOptions {
  text?: Dynamic<string>;
  textAlign?: Dynamic<TextAlign>;
}

export function createButton(
  object: TuiObject,
  options: CreateButtonOptions,
): ButtonComponent {
  const button: ButtonComponent = {
    text: options.text,
    textAlign: options.textAlign,
    ...createComponent(object, {
      name: "button",
      interactive: true,
      ...options,
    }),
  };

  const focusedWithin = [button, ...button.focusedWithin];

  createBox(button, {
    ...options,
    focusedWithin,
  });

  if (button.styler.frame) {
    createFrame(button, {
      ...options,
      rectangle() {
        const rectangle = getStaticValue(button.rectangle);
        return {
          column: rectangle.column - 1,
          row: rectangle.row - 1,
          width: rectangle.width + 1,
          height: rectangle.height + 1,
        };
      },
      styler: button.styler.frame,
      focusedWithin,
    });
  }

  if (button.text) {
    createLabel(button, {
      drawPriority: button.drawPriority + 1,
      text: button.text,
      rectangle: button.rectangle,
      textAlign: () =>
        getStaticValue(
          button.textAlign || ({
            horizontal: "center",
            vertical: "center",
          }),
        ),
      styler: button.styler,
      focusedWithin,
    });
  }

  return button;
}
