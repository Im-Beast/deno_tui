import { drawPixel } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  ExtendedTuiComponent,
  getCurrentStyler,
  removeComponent,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createFrame, FrameComponent } from "./frame.ts";

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
  let frame: FrameComponent | undefined;

  const checkbox: CheckboxComponent = createComponent(object, {
    name: "checkbox",
    interactive: true,
    draw() {
      const rectangle = getStaticValue(checkbox.rectangle);

      if (!frame && getStaticValue(checkbox.styler).frame) {
        frame = createFrame(checkbox, {
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
          styler() {
            const styler = getStaticValue(checkbox.styler);

            if (frame && !styler.frame) {
              removeComponent(frame);
              frame = undefined;
            }

            return styler.frame || {};
          },
          focusedWithin: [checkbox, ...checkbox.focusedWithin],
        });
      }

      drawPixel(object.canvas, {
        ...rectangle,
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

  checkbox.on("active", () => {
    checkbox.value = !checkbox.value;
    checkbox.emitter.emit("valueChange", !checkbox.value);
  });

  return checkbox;
}
