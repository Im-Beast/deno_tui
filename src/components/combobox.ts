import { KeyPress } from "../key_reader.ts";
import { createComponent, TuiComponent } from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { CreateBoxOptions } from "./box.ts";
import { createButton } from "./button.ts";

export type ComboboxValue = string | { label: string; value: unknown };

export interface CreateComboboxOptions extends CreateBoxOptions {
  items: ComboboxValue[];
  defaultValue?: ComboboxValue | number;
}

export interface ComboboxComponent
  extends
    TuiComponent<"valueChange" | "addItem" | "removeItem", ComboboxValue> {
  items: ComboboxValue[];
  value: ComboboxValue;
}

export function createCombobox(
  object: TuiObject,
  options: CreateComboboxOptions,
): ComboboxComponent {
  const defaultValue = typeof options.defaultValue === "undefined"
    ? options.items[0]
    : typeof options.defaultValue === "number"
    ? options.items[options.defaultValue]
    : options.defaultValue;

  const combobox: ComboboxComponent = {
    value: defaultValue,
    items: options.items,
    ...createComponent(object, {
      name: "combobox",
      interactive: true,
      ...options,
    }),
  };

  const main = createButton(combobox, {
    ...options,
    text: () =>
      typeof combobox.value === "string"
        ? combobox.value
        : combobox.value.label,
  });

  const close = () => {
    opened = false;
    const interactiveChildren = main.children.filter((c) => c.interactive);

    for (const { remove } of interactiveChildren) {
      remove();
    }
  };

  const escClose = ({ key }: KeyPress) => {
    if (key === "escape") close();
  };

  let opened = false;
  main.on("key", escClose);
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
          ...options.styler,
          border: undefined,
        },
        rectangle: {
          ...combobox.staticRectangle,
          row: combobox.staticRectangle.row + 1 + i,
        },
      });

      button.on("key", escClose);
      button.on("active", () => {
        combobox.value = item;
      });
    }
  });

  return combobox;
}
