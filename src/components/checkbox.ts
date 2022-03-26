// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { CompileStyler } from "../canvas.ts";
import { TuiStyler } from "../tui.ts";
import {
  createComponent,
  CreateComponentOptions,
  ExtendedComponent,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { cloneAndAssign } from "../util.ts";
import { createButton, CreateButtonOptions } from "./button.ts";

/** Interactive checkbox component */
export type CheckboxComponent = ExtendedComponent<
  "checkbox",
  {
    /** Whether checkbox is checked or not */
    value: boolean;
    frame: { enabled: true; styler: CompileStyler<TuiStyler> } | {
      enabled: false;
      styler?: CompileStyler<TuiStyler>;
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
 * @param parent - parent of the created box, either tui or other component
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
  const checkbox: CheckboxComponent = createComponent(parent, options, {
    name: "checkbox",
    interactive: false,
    value: !!options.value,
    frame: options.frame ?? {
      enabled: false,
    },
  });

  const button = createButton(
    checkbox,
    cloneAndAssign(options, {
      interactive: true,
      label: {
        get text() {
          return checkbox.value ? "✓" : "✗";
        },
        align: {
          horizontal: "center",
          vertical: "center",
        },
      },
    }),
  );

  button.on("active", () => checkbox.value = !checkbox.value);

  checkbox.on("active", () => {
    checkbox.value = !checkbox.value;
    checkbox.emit("valueChange", !checkbox.value);
  });

  return checkbox;
}
