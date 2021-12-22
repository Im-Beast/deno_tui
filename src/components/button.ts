// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  createComponent,
  ExtendedTuiComponent,
  removeComponent,
} from "../tui_component.ts";
import { TextAlign, TuiObject } from "../types.ts";
import { createBox, CreateBoxOptions } from "./box.ts";
import { createLabel, LabelComponent } from "./label.ts";

interface ButtonExtension {
  /** Label's text displayed on the button */
  label?: {
    /** Value of the label */
    text?: string;
    /**
     * Position of the label
     * Requires `label` property to be set.
     */
    align?: TextAlign;
  };
}

/** Interactive button component */
export type ButtonComponent = ExtendedTuiComponent<"button", ButtonExtension>;

export type CreateButtonOptions = CreateBoxOptions & ButtonExtension;

/**
 * Create ButtonComponent
 *
 * It is interactive by default
 * @param object - parent of the created box, either Tui instance or other component
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * createButton(tui, {
 *  rectangle: {
 *    column: 2,
 *    row: 2,
 *    width: 10,
 *    height: 5
 *  },
 *  label: "Click me",
 * });
 * ```
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
          value: {
            get text() {
              const text = button.label?.text;

              if (label && typeof text !== "string") {
                removeComponent(label);
                label = undefined;
              }

              return text ?? "";
            },
            align: button.label?.align ?? ({
              horizontal: "center",
              vertical: "center",
            }),
          },
          rectangle: button.rectangle,
          styler: button.styler,
          focusedWithin: [button, ...button.focusedWithin],
        });
      }
    },
  }, {
    label: options.label,
  });

  createBox(button, {
    ...options,
    focusedWithin: [button, ...button.focusedWithin],
  });

  return button;
}
