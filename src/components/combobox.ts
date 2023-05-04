// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { BaseSignal, Computed, Signal } from "../signals.ts";
import { signalify } from "../utils/signals.ts";
import { Button, ButtonOptions } from "./button.ts";

export interface ComboBoxOptions<Items extends string[] = string[]> extends Omit<ButtonOptions, "label"> {
  placeholder?: string;
  items: Items | BaseSignal<Items>;
  selectedItem?: number | undefined | BaseSignal<number | undefined>;
}

export class ComboBox<Items extends string[] = string[]> extends Button {
  declare subComponents: { [button: number]: Button };
  #subComponentsLength: number;

  items: BaseSignal<Items>;
  expanded: BaseSignal<boolean>;
  selectedItem: BaseSignal<number | undefined>;
  placeholder: BaseSignal<string>;

  constructor(options: ComboBoxOptions<Items>) {
    const selectedItemSignal = signalify(options.selectedItem);
    const itemsSignal = signalify(options.items, { deepObserve: true });
    const placeholderSignal = signalify(options.placeholder ?? "");

    const buttonOptions: ButtonOptions = options;
    buttonOptions.label = {
      text: new Computed(() => {
        const items = itemsSignal.value;
        const selectedItem = selectedItemSignal.value;
        const placeholder = placeholderSignal.value;
        return selectedItem === undefined ? placeholder : items[selectedItem];
      }),
    };

    super(buttonOptions);

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

      button.state.subscribe(() => {
        if (button.state.peek() !== "active") return;
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
