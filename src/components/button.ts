// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  createComponent,
  ExtendedTuiComponent,
  removeComponent,
} from "../tui_component.ts";
import { Dynamic, TextAlign, TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createBox, CreateBoxOptions } from "./box.ts";
import { createLabel, LabelComponent } from "./label.ts";

interface ButtonExtension {
  /** Label's text displayed on the button */
  label?: Dynamic<string>;
  /**
   * Position of the label
   * Requires `label` property to be set.
   */
  labelAlign?: Dynamic<TextAlign>;
}

/** Interactive button component */
export type ButtonComponent = ExtendedTuiComponent<"button", ButtonExtension>;

export type CreateButtonOptions = CreateBoxOptions & ButtonExtension;

/**
 * Create ButtonComponent
 * It is interactive by default
 * @param object - parent of the created box, either Tui instance or other component
 * @param options
 */
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
