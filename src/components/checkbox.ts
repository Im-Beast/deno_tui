// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  createComponent,
  CreateComponentOptions,
  ExtendedTuiComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { createButton } from "./button.ts";

interface CheckboxExtension {
  /** Whether checkbox is checked or not */
  value?: boolean;
}

/** Interactive checkbox component */
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
 *
 * It is interactive by default
 * @param object - parent of the created box, either Tui instance or other component
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * createCheckbox(tui, {
 *  rectangle: {
 *    column: 2,
 *    row: 2,
 *    width: 10,
 *    height: 5
 *  },
 *  value: true,
 * });
 * ```
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
    rectangle: checkbox.rectangle,
    label: {
      get text() {
        return checkbox.value ? "✓" : "✗";
      },
      align: {
        horizontal: "center",
        vertical: "center",
      },
    },
    get styler() {
      return getCurrentStyler(checkbox, {
        active: {
          value: !!checkbox.value,
          force: true,
        },
      });
    },
    update() {
      if (button.label) {
        button.label.text = checkbox.value ? "✓" : "✗";
      }
    },
  });

  button.on("active", () => checkbox.value = !checkbox.value);

  checkbox.on("active", () => {
    checkbox.value = !checkbox.value;
    checkbox.emitter.emit("valueChange", !checkbox.value);
  });

  return checkbox;
}
