import { drawPixel } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  ExtendedTuiComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createFrame } from "./frame.ts";

export type CheckboxComponent = ExtendedTuiComponent<
  "checkbox",
  {
    value: boolean;
  },
  "valueChange",
  boolean
>;

export interface CreateCheckboxOptions extends
  Omit<
    CreateComponentOptions,
    "interactive" | "name"
  > {
  default: boolean;
}

export function createCheckbox(
  object: TuiObject,
  options: CreateCheckboxOptions,
): CheckboxComponent {
  const checkbox: CheckboxComponent = createComponent(object, {
    name: "checkbox",
    interactive: true,
    draw() {
      drawPixel(object.canvas, {
        ...getStaticValue(checkbox.rectangle),
        value: checkbox.value ? "✓" : "✗",
        styler: getCurrentStyler(checkbox, {
          active: {
            value: checkbox.value,
            force: true,
          },
        }),
      });
    },
    ...options,
  }, {
    value: options.default,
  });

  if (checkbox.styler.frame) {
    createFrame(checkbox, {
      ...options,
      rectangle() {
        const rectangle = getStaticValue(checkbox.rectangle);
        return {
          column: rectangle.column - 1,
          row: rectangle.row - 1,
          width: rectangle.width + 1,
          height: rectangle.height + 1,
        };
      },
      styler: checkbox.styler.frame,
      focusedWithin: [checkbox, ...checkbox.focusedWithin],
    });
  }

  checkbox.on("active", () => {
    checkbox.value = !checkbox.value;
    checkbox.emitter.emit("valueChange", !checkbox.value);
  });

  return checkbox;
}
