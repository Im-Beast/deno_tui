import {
  createComponent,
  ExtendedTuiComponent,
  removeComponent,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";
import { createButton } from "./button.ts";

export type ComboboxValue = string | { label: string; value: unknown };

export type ComboboxComponent = ExtendedTuiComponent<
  "combobox",
  {
    readonly valueIndex: (() => number);
    items: ComboboxValue[];
    value: ComboboxValue | number;
  },
  "valueChange" | "addItem" | "removeItem",
  ComboboxValue
>;

export function getComboboxValueLabel(value: ComboboxValue): string {
  return typeof value === "string" ? value : value.label;
}

export interface CreateComboboxOptions extends CreateBoxOptions {
  items: ComboboxValue[];
  value?: ComboboxValue | number;
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
    valueIndex: () =>
      typeof combobox.value === "number"
        ? combobox.value
        : combobox.items.indexOf(combobox.value),
  });

  const main = createButton(combobox, {
    ...options,
    text: () =>
      getComboboxValueLabel(
        typeof combobox.value === "number"
          ? combobox.items[combobox.value % combobox.items.length]
          : combobox.value,
      ),
  });

  let opened = false;

  const close = () => {
    opened = false;
    const interactiveChildren = main.children.filter((c) => c.interactive);

    for (const child of interactiveChildren) {
      removeComponent(child);
    }
  };

  main.on("key", ({ key }) => {
    if (key === "escape") close();
  });

  main.on("active", () => {
    opened = !opened;
    if (!opened) {
      return close();
    }

    for (const [i, item] of combobox.items.entries()) {
      const text = typeof item === "string" ? item : item.label;
      const button = createButton(main, {
        ...options,
        text,
        styler: {
          ...combobox.styler,
          frame: undefined,
        },
        rectangle() {
          const rectangle = getStaticValue(combobox.rectangle);
          return {
            ...rectangle,
            row: rectangle.row + i + 1,
          };
        },
      });

      button.on("active", () => {
        combobox.value = item;
      });
    }
  });

  return combobox;
}
