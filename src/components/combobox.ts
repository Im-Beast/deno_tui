// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { KeyPress } from "../key_reader.ts";
import {
  createComponent,
  ExtendedComponent,
  removeComponent,
} from "../tui_component.ts";
import { TextAlign, TuiObject } from "../types.ts";
import { textWidth } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";
import { createButton } from "./button.ts";

/**
 * Get label from ComboboxValue
 * @param value - item to get label from
 */
export function getComboboxValueLabel(value: ComboboxValue): string {
  return typeof value === "string" ? value : value.label;
}

/** Type of value accepted by combobox */
export type ComboboxValue = string | { label: string; value: unknown };

/** Interactive combobox component */
export type ComboboxComponent = ExtendedComponent<
  "combobox",
  {
    /** Items available to choose in combobox */
    items: ComboboxValue[];
    /**
     * Currently selected item
     * - When you're setting value you can use either value of the item or index pointing to it in `items` property
     * - When component processes change it will return value of the item
     */
    value: ComboboxValue | number;
    /** Index of currently selected item */
    readonly valueIndex: number;
    /** Label's text displayed on the combobox */
    label?: {
      /** Value of the label */
      text?: string;
      /**
       * Position of the label
       * Requires `label` property to be set.
       */
      align?: TextAlign;
    };
    /** TODO: note */
    expandItemsWidth: boolean;
  },
  "valueChange",
  ComboboxValue
>;

export type CreateComboboxOptions = CreateBoxOptions & {
  /** Items available to choose in combobox */
  items: ComboboxValue[];
  /**
   * Currently selected item
   * - When you're setting value you can use either value of the item or index pointing to it in `items` property
   * - When component processes change it will return value of the item
   */
  value?: ComboboxValue | number;
  /** Label's text displayed on the combobox */
  label?: {
    /** Value of the label */
    text?: string;
    /**
     * Position of the label
     * Requires `label` property to be set.
     */
    align?: TextAlign;
  };
  expandItemsWidth?: boolean;
};

/**
 * Create ComboboxComponent
 *
 * It is interactive by default
 * @param parent - parent of the created box, either Tui instance or other component
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * createCombobox(tui, {
 *  rectangle: {
 *    column: 2,
 *    row: 2,
 *    width: 10,
 *    height: 5
 *  },
 *  items: ["one", "two", { label: "three", value: 3 }],
 * });
 * ```
 */
export function createCombobox(
  parent: TuiObject,
  options: CreateComboboxOptions,
): ComboboxComponent {
  const value = typeof options.value === "undefined"
    ? options.items[0]
    : typeof options.value === "number"
    ? options.items[options.value % options.items.length]
    : options.value;

  const combobox: ComboboxComponent = createComponent(parent, {
    name: "combobox",
    interactive: true,
    ...options,
  }, {
    value,
    items: options.items,
    label: options.label,
    get valueIndex() {
      return typeof this.value === "number"
        ? this.value
        : this.items.indexOf(this.value);
    },
    expandItemsWidth: options.expandItemsWidth ?? false,
  });

  const main = createButton(combobox, {
    ...options,
    interactive: false,
    rectangle: combobox.rectangle,
    label: {
      get text() {
        return combobox.label?.text ??
          getComboboxValueLabel(
            typeof combobox.value === "number"
              ? combobox.items[combobox.value % combobox.items.length]
              : combobox.value,
          );
      },
      align: combobox.label?.align,
    },
    styler: combobox.styler,
    focusedWithin: [combobox, ...combobox.focusedWithin],
    drawPriority: 1,
  });

  let opened = false;

  const close = () => {
    opened = false;
    const interactiveChildren = main.children.filter((c) => c.interactive);

    for (const child of interactiveChildren) {
      removeComponent(child);
    }

    combobox.tui.focused.item = combobox;
  };

  combobox.on("key", ({ key }: KeyPress) => {
    if (key === "escape") close();
  });

  combobox.on("active", () => {
    opened = !opened;
    if (!opened) {
      return close();
    }

    let width = main.rectangle.width;

    for (const [i, item] of combobox.items.entries()) {
      const label = typeof item === "string" ? item : item.label;

      if (combobox.expandItemsWidth && textWidth(label) > width) {
        width = textWidth(label);
      }

      const button = createButton(main, {
        ...options,
        label: {
          text: label,
          align: combobox.label?.align,
        },
        get rectangle() {
          const rectangle = combobox.rectangle;
          return {
            ...rectangle,
            row: rectangle.row + i + 1,
            width,
          };
        },
        get styler() {
          return combobox.styler;
        },
        frame: {
          enabled: false,
        },
        drawPriority: 2,
      });

      button.on("active", () => {
        combobox.value = item;
        combobox.emit("valueChange", item);
        close();
      });

      button.on("key", ({ key }: KeyPress) => {
        if (key === "escape") close();
      });
    }
  });

  return combobox;
}
