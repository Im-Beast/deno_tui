// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Computed, Signal, SignalOfObject } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";
import { Button, ButtonOptions } from "./button.ts";

export interface ComboBoxOptions<Items extends string[] = string[]> extends Omit<ButtonOptions, "label"> {
  placeholder?: string;
  items: Items | SignalOfObject<Items>;
  selectedItem?: number | undefined | Signal<number | undefined>;
}

/**
 * Component for creating interactive combobox
 *
 * @example
 * ```ts
 * new ComboBox({
 *  parent: tui,
 *  items: ["one", "two", "three", "four"],
 *  placeholder: "choose number",
 *  theme: {
 *    base: crayon.bgGreen,
 *    focused: crayon.bgLightGreen,
 *    active: crayon.bgYellow,
 *  },
 *  rectangle: {
 *    column: 1,
 *    row: 1,
 *    height: 1,
 *    width: 14,
 *  },
 *  zIndex: 0,
 * });
 * ```
 */
export class ComboBox<Items extends string[] = string[]> extends Button {
  declare subComponents: { [button: number]: Button };
  #subComponentsLength: number;

  items: Signal<Items>;
  expanded: Signal<boolean>;
  selectedItem: Signal<number | undefined>;
  placeholder: Signal<string>;

  constructor(options: ComboBoxOptions<Items>) {
    const selectedItemSignal = signalify(options.selectedItem);
    const itemsSignal = signalify(options.items, { deepObserve: true });
    const placeholderSignal = signalify(options.placeholder ?? "");

    Object.assign(options, {
      label: {
        text: new Computed(() => {
          const items = itemsSignal.value;
          const selectedItem = selectedItemSignal.value;
          const placeholder = placeholderSignal.value;
          return selectedItem === undefined ? placeholder : items[selectedItem];
        }),
      },
    });

    super(options);

    this.items = itemsSignal;
    this.expanded = new Signal(false);
    this.placeholder = placeholderSignal;
    this.selectedItem = selectedItemSignal;

    this.#subComponentsLength = this.items.value.length;
    this.#updateItemButtons();

    this.items.subscribe((items) => {
      this.#updateItemButtons();
      this.#subComponentsLength = items.length;
    });
  }

  #updateItemButtons(): void {
    const { subComponents } = this;
    const items = this.items.peek();

    for (let i = 0; i < Math.max(items.length, this.#subComponentsLength); ++i) {
      const subComponent = subComponents[i];
      if (subComponent) {
        if (i >= items.length) {
          subComponent.destroy();
          delete subComponents[i];
        }
        continue;
      }

      const buttonRectangle = { column: 0, row: 0, width: 0, height: 0 };

      const button = new Button({
        parent: this,
        theme: this.theme,
        zIndex: this.zIndex,
        visible: this.expanded,
        label: {
          text: new Computed(() => this.items.value[i]),
        },
        rectangle: new Computed(() => {
          const { column, row, width, height } = this.rectangle.value;
          buttonRectangle.column = column;
          buttonRectangle.row = row + (i + 1) * height;
          buttonRectangle.width = width;
          buttonRectangle.height = height;
          return buttonRectangle;
        }),
      });

      button.state.when("active", () => {
        this.selectedItem.value = i;
        this.expanded.value = false;
      });

      subComponents[i] = button;
    }
  }

  interact(method: "mouse" | "keyboard"): void {
    super.interact(method);

    if (this.state.peek() === "active") {
      this.expanded.value = !this.expanded.peek();
    }
  }
}
