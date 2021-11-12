import { drawPixel } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
  TuiComponent,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { createFrame } from "./frame.ts";

export interface CreateCheckboxOptions extends
  Omit<
    CreateComponentOptions,
    "interactive" | "name"
  > {
  default: boolean;
}

export interface CheckboxComponent
  extends TuiComponent<"valueChange", boolean> {
  value: boolean;
}

export function createCheckbox(
  object: TuiObject,
  options: CreateCheckboxOptions,
): CheckboxComponent {
  const checkbox = {
    value: options.default,
    ...createComponent<"valueChange", boolean>(object, {
      name: "checkbox",
      interactive: true,
      draw() {
        for (const { draw } of checkbox.children) {
          draw();
        }

        const styler = getCurrentStyler(checkbox, {
          active: {
            value: checkbox.value,
            force: true,
          },
        });

        const { column, row } = checkbox.staticRectangle;

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

  if (options.styler.border) {
    createFrame(checkbox, {
      ...options,
      rectangle: () => ({
        column: checkbox.staticRectangle.column - 1,
        row: checkbox.staticRectangle.row - 1,
        width: checkbox.staticRectangle.width + 1,
        height: checkbox.staticRectangle.height + 1,
      }),
      styler: options.styler.border,
      focusedWithin: [checkbox, ...(options.focusedWithin || [])],
    });
  }

  checkbox.on("active", () => {
    checkbox.value = !checkbox.value;
    checkbox.emitter.emit("valueChange", !checkbox.value);
  });

  return checkbox;
}
