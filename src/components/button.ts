import {
  createComponent,
  ExtendedTuiComponent,
  removeComponent,
} from "../tui_component.ts";
import { Dynamic, TextAlign, TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createBox, CreateBoxOptions } from "./box.ts";
import { createLabel, LabelComponent } from "./label.ts";

export type ButtonComponent = ExtendedTuiComponent<"button", {
  label?: Dynamic<string>;
  labelAlign?: Dynamic<TextAlign>;
}>;

export interface CreateButtonOptions extends CreateBoxOptions {
  label?: Dynamic<string>;
  labelAlign?: Dynamic<TextAlign>;
}

export function createButton(
  object: TuiObject,
  options: CreateButtonOptions,
): ButtonComponent {
  let label: LabelComponent | undefined;

  const button: ButtonComponent = createComponent(object, {
    name: "button",
    interactive: true,
    ...options,
    draw() {
      if (!label && button.label) {
        label = createLabel(button, {
          drawPriority: button.drawPriority + 1,
          text() {
            const value = getStaticValue(button.label);

            if (label && typeof value !== "string") {
              removeComponent(label);
              label = undefined;
            }

            return value || "";
          },
          rectangle: button.rectangle,
          textAlign: () =>
            getStaticValue(
              button.labelAlign || ({
                horizontal: "center",
                vertical: "center",
              }),
            ),
          styler: () => getStaticValue(button.styler),
          focusedWithin: [button, ...button.focusedWithin],
        });
      }
    },
  }, {
    label: options.label,
    labelAlign: options.labelAlign,
  });

  createBox(button, {
    ...options,
    focusedWithin: [button, ...button.focusedWithin],
    styler: () => getStaticValue(button.styler),
    rectangle: () => getStaticValue(button.rectangle),
  });

  return button;
}
