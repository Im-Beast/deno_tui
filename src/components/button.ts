// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { ComponentOptions } from "../component.ts";
import { Box } from "./box.ts";

import type { BoxObject } from "../canvas/box.ts";
import { Label, LabelAlign } from "./label.ts";
import { BaseSignal } from "../signals.ts";
import { signalify } from "../utils/signals.ts";

const centerAlign: LabelAlign = {
  horizontal: "center",
  vertical: "center",
};

export interface ButtonOptions extends ComponentOptions {
  label?: {
    value: string | BaseSignal<string>;
    align?: LabelAlign | BaseSignal<LabelAlign>;
  };
}

export class Button extends Box {
  declare drawnObjects: { box: BoxObject };
  declare subComponents: { label?: Label };
  label: BaseSignal<
    {
      value: BaseSignal<string>;
      align: BaseSignal<LabelAlign>;
    } | undefined
  >;

  constructor(options: ButtonOptions) {
    super(options);

    const { label } = options;

    if (label) {
      label.value = signalify(label.value);
      label.align = signalify(label.align ?? centerAlign);
    }

    this.label = signalify(label as unknown as this["label"], { deepObserve: true });
  }

  draw(): void {
    super.draw();

    if (this.label?.value?.value) {
      const label = new Label({
        parent: this,
        theme: this.theme,
        zIndex: this.zIndex,
        rectangle: this.rectangle,
        overwriteRectangle: true,
        value: this.label.value.value,
        align: this.label.value.align,
      });

      this.state.subscribe((value) => {
        label.state.value = value;
      });

      label.subComponentOf = this;
      this.subComponents.label = label;
      this.children.push(label);
    }
  }

  interact(method: "mouse" | "keyboard"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state.value = this.state.peek() === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }
}
