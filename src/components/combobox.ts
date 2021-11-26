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

export function getComboboxValueLabel(value: ComboboxValue): string {
  return typeof value === "string" ? value : value.label;
}

export type ComboboxValue = string | { label: string; value: unknown };

export type ComboboxComponent = ExtendedTuiComponent<
  "combobox",
  {
    readonly valueIndex: (() => number);
    items: ComboboxValue[];
    value: ComboboxValue | number;
    label?: Dynamic<string>;
    textAlign: Dynamic<TextAlign>;
    expandItemsWidth?: Dynamic<boolean>;
  },
  "valueChange",
  ComboboxValue
>;

export interface CreateComboboxOptions extends CreateBoxOptions {
  items: ComboboxValue[];
  value?: ComboboxValue | number;
  label?: Dynamic<string>;
  textAlign?: Dynamic<TextAlign>;
  expandItemsWidth?: Dynamic<boolean>;
}

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
    textAlign: options.textAlign || {
      horizontal: "center",
      vertical: "center",
    },
    expandItemsWidth: options.expandItemsWidth,
  });

  const main = createButton(combobox, {
    ...options,
    labelAlign: () => getStaticValue(combobox.textAlign),
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
        labelAlign: () => getStaticValue(combobox.textAlign),
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
