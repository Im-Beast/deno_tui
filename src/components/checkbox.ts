// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { ComponentOptions } from "../component.ts";
import { Computed, Signal } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";
import { Button } from "./button.ts";

export enum Mark {
  Check = "✓",
  Cross = "✗",
}

export interface CheckBoxOptions extends ComponentOptions {
  checked: boolean | Signal<boolean>;
}

export class CheckBox extends Button {
  checked: Signal<boolean>;

  constructor(options: CheckBoxOptions) {
    const checkedSignal = signalify(options.checked);

    Object.assign(options, {
      label: {
        text: new Computed(() => checkedSignal.value ? Mark.Check : Mark.Cross),
      },
    });

    super(options);
    this.checked = checkedSignal;
  }

  interact(method: "mouse" | "keyboard"): void {
    super.interact(method);
    if (this.state.peek() === "active") this.checked.value = !this.checked.peek();
  }
}
