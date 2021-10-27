import { drawPixel } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
  TuiComponent,
} from "../tui_component.ts";
import { TuiObject, TuiRectangle } from "../types.ts";
import { createFrame } from "./frame.ts";

export type CreateCheckboxOptions =
  & Omit<
    CreateComponentOptions,
    "interactive" | "name" | "rectangle"
  >
  & {
    default: boolean;
    column: number;
    row: number;
  };

export type CheckboxComponent = TuiComponent<"valueChange", boolean> & {
  value: boolean;
};

export function createCheckbox(
  object: TuiObject,
  options: CreateCheckboxOptions,
): CheckboxComponent {
  const { row, column } = options;

  const rectangle: TuiRectangle = {
    column,
    row,
    width: 1,
    height: 1,
  };

  const checkbox = {
    value: options.default,
    ...createComponent<"valueChange", boolean>(object, {
      name: "checkbox",
      interactive: true,
      rectangle,
      draw() {
        checkbox.components.tree.forEach((component) => component.draw());

        const styler = getCurrentStyler(checkbox, {
          active: {
            value: checkbox.value,
            force: true,
          },
        });

        drawPixel(object.canvas, {
          column,
          row,
          value: checkbox.value ? "✓" : "✗",
          styler,
        });
      },
      ...options,
    }),
  };

  const focusedWithin = [checkbox, ...options.focusedWithin];

  if (options.styler.border) {
    createFrame(checkbox, {
      ...options,
      rectangle: {
        column: column - 1,
        row: row - 1,
        width: 2,
        height: 2,
      },
      styler: options.styler.border,
      focusedWithin,
    });
  }

  checkbox.on("active", () => {
    checkbox.value = !checkbox.value;
    checkbox.emitter.emit("valueChange", !checkbox.value);
  });

  return checkbox;
}
