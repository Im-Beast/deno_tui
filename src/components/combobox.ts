// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { KeyPress } from "../key_reader.ts";
import {
  createComponent,
  ExtendedTuiComponent,
  removeComponent,
} from "../tui_component.ts";
import { Dynamic, TextAlign, TuiObject } from "../types.ts";
import { getStaticValue, textWidth } from "../util.ts";
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
export type ComboboxComponent = ExtendedTuiComponent<
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
    readonly valueIndex: (() => number);
    /** Label's text displayed on the button */
    label?: Dynamic<string>;
    /**
     * Position of the label
     * Requires `label` property to be set.
     */
    labelAlign?: Dynamic<TextAlign>;
    expandItemsWidth?: Dynamic<boolean>;
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
  /** Label's text displayed on the button */
  label?: Dynamic<string>;
  /**
   * Position of the label
   * Requires `label` property to be set.
   */
  labelAlign?: Dynamic<TextAlign>;
  expandItemsWidth?: Dynamic<boolean>;
};

/**
 * Create ComboboxComponent
 * It is interactive by default
 * @param object - parent of the created box, either Tui instance or other component
 * @param options
 */
export function createCombobox(
  object: TuiObject,
  options: CreateComboboxOptions,
): ComboboxComponent {
  const value = typeof options.value === "undefined"
    ? options.items[0]
    : typeof options.value === "number"
    ? options.items[options.value % options.items.length]
    : options.value;

  const combobox: ComboboxComponent = createComponent(object, {
    name: "combobox",
    interactive: true,
    ...options,
  }, {
    value,
    items: options.items,
    label: options.label,
    valueIndex: () =>
      typeof combobox.value === "number"
        ? combobox.value
        : combobox.items.indexOf(combobox.value),
    labelAlign: options.labelAlign || {
      horizontal: "center",
      vertical: "center",
    },
    expandItemsWidth: options.expandItemsWidth,
  });

  const main = createButton(combobox, {
    ...options,
    labelAlign: () => getStaticValue(combobox.labelAlign),
    rectangle: () => getStaticValue(combobox.rectangle),
    label: () =>
      getStaticValue(combobox.label) ||
      getComboboxValueLabel(
        typeof combobox.value === "number"
          ? combobox.items[combobox.value % combobox.items.length]
          : combobox.value,
      ),
    styler: () => getStaticValue(combobox.styler),
    focusedWithin: [combobox, ...combobox.focusedWithin],
    drawPriority: 1,
  });
  main.interactive = false;

  let opened = false;

  const close = () => {
    opened = false;
    const interactiveChildren = main.children.filter((c) => c.interactive);

    for (const child of interactiveChildren) {
      removeComponent(child);
    }

    combobox.instance.selected.item = combobox;
  };

  combobox.on("key", ({ key }: KeyPress) => {
    if (key === "escape") close();
  });

  combobox.on("active", () => {
    opened = !opened;
    if (!opened) {
      return close();
    }

    let width = () => getStaticValue(main.rectangle).width;

    for (const [i, item] of combobox.items.entries()) {
      const label = typeof item === "string" ? item : item.label;

      if (combobox.expandItemsWidth && textWidth(label) > width()) {
        width = () => textWidth(label);
      }

      const button = createButton(main, {
        ...options,
        label,
        labelAlign: () => getStaticValue(combobox.labelAlign),
        styler: () => ({
          ...getStaticValue(combobox.styler),
          frame: undefined,
        }),
        rectangle() {
          const rectangle = getStaticValue(combobox.rectangle);
          return {
            ...rectangle,
            width: width(),
            row: rectangle.row + i + 1,
          };
        },
        drawPriority: 2,
      });

      button.on("active", () => {
        combobox.value = item;
        combobox.emitter.emit("valueChange", item);
        close();
      });

      button.on("key", ({ key }: KeyPress) => {
        if (key === "escape") close();
      });
    }
  });

  return combobox;
}
