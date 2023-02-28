import { ComponentOptions } from "../component.ts";
import { Button } from "./button.ts";

export enum Mark {
  Check = "✓",
  Cross = "✗",
}

export interface CheckBoxOptions extends ComponentOptions {
  value: boolean;
}

export class CheckBox extends Button {
  value: boolean;
  label: { value: Mark };

  constructor(options: CheckBoxOptions) {
    super(options);
    this.value = options.value;
    this.label = { value: this.value ? Mark.Check : Mark.Cross };
  }

  update(): void {
    this.label.value = this.value ? Mark.Check : Mark.Cross;
    super.update();
  }

  interact(method: "mouse" | "keyboard"): void {
    super.interact(method);
    if (this.state === "active") this.value = !this.value;
  }
}
