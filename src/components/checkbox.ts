// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  createComponent,
  CreateComponentOptions,
  ExtendedTuiComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createButton } from "./button.ts";

interface CheckboxExtension {
  /** Whether checkbox is checked or not */
  value?: boolean;
}

export type CheckboxComponent = ExtendedTuiComponent<
  "checkbox",
  CheckboxExtension,
  "valueChange",
  boolean
>;

export type CreateCheckboxOptions =
  & Omit<CreateComponentOptions, "interactive" | "name">
  & CheckboxExtension;

/**
 * Create CheckboxComponent
 * It is interactive by default
 * @param object - parent of the created box, either Tui instance or other component
 * @param options
 */
export function createCheckbox(
  object: TuiObject,
  options: CreateCheckboxOptions,
): CheckboxComponent {
  const checkbox: CheckboxComponent = createComponent(object, {
    name: "checkbox",
    ...options,
  }, {
    value: !!options.value,
  });

  const button = createButton(checkbox, {
    rectangle: () => getStaticValue(checkbox.rectangle),
    styler: () => {
      return getCurrentStyler(checkbox, {
        active: {
          value: !!checkbox.value,
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
