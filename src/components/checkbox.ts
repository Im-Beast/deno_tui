import {
  createComponent,
  CreateComponentOptions,
  ExtendedTuiComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createButton } from "./button.ts";

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
    ...options,
  }, {
    value: options.default,
  });

  const button = createButton(checkbox, {
    rectangle: () => getStaticValue(checkbox.rectangle),
    styler: () => {
      return getCurrentStyler(checkbox, {
        active: {
          value: checkbox.value,
          force: true,
        },
      });
    },
    label: () => checkbox.value ? "✓" : "✗",
    labelAlign: {
      horizontal: "center",
      vertical: "center",
    },
  });

  button.on("active", () => checkbox.value = !checkbox.value);

  checkbox.on("active", () => {
    checkbox.value = !checkbox.value;
    checkbox.emitter.emit("valueChange", !checkbox.value);
  });

  return checkbox;
}
