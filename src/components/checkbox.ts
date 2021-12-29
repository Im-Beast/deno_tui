// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { TuiStyler } from "../tui.ts";
import {
  createComponent,
  CreateComponentOptions,
  ExtendedComponent,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { createButton, CreateButtonOptions } from "./button.ts";

/** Interactive checkbox component */
export type CheckboxComponent = ExtendedComponent<
  "checkbox",
  {
    /** Whether checkbox is checked or not */
    value: boolean;
    frame: { enabled: true; styler: TuiStyler } | {
      enabled: false;
      styler?: TuiStyler;
    };
  },
  "valueChange",
  boolean
>;

export type CreateCheckboxOptions =
  & Omit<CreateComponentOptions, "name" | "interactive">
  & Pick<CreateButtonOptions, "frame">
  & {
    /** Whether checkbox is checked or not */
    value?: boolean;
    interactive?: boolean;
  };

/**
 * Create CheckboxComponent
 *
 * It is interactive by default
 * @param parent - parent of the created box, either Tui instance or other component
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
  parent: TuiObject,
  options: CreateCheckboxOptions,
): CheckboxComponent {
  const checkbox: CheckboxComponent = createComponent(parent, {
    name: "checkbox",
    interactive: false,
    ...options,
  }, {
    value: !!options.value,
    frame: options.frame ?? {
      enabled: false,
    },
  });

  const button = createButton(checkbox, {
    interactive: true,
    get rectangle() {
      return checkbox.rectangle;
    },
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
      return checkbox.styler;
    },
    get frame() {
      return checkbox.frame;
    },
  });

  button.on("active", () => checkbox.value = !checkbox.value);

  checkbox.on("active", () => {
    checkbox.value = !checkbox.value;
    checkbox.emit("valueChange", !checkbox.value);
  });

  return checkbox;
}
