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
    text: string | BaseSignal<string>;
    align?: LabelAlign | BaseSignal<LabelAlign>;
  };
}

export class Button extends Box {
  declare drawnObjects: { box: BoxObject };
  declare subComponents: { label?: Label };
  label: {
    text: BaseSignal<string>;
    align: BaseSignal<LabelAlign>;
  };

  constructor(options: ButtonOptions) {
    super(options);

    let { label } = options;

    if (!label) {
      label = { text: "", align: centerAlign };
    }

    label.text = signalify(label.text);
    label.align = signalify(label.align ?? centerAlign);

    this.label = label as this["label"];
    this.label.text.subscribe(() => {
      this.#updateLabelSubcomponent();
    });
  }

  draw(): void {
    super.draw();
    this.#updateLabelSubcomponent();
  }

  interact(method: "mouse" | "keyboard"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state.value = this.state.peek() === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }

  #updateLabelSubcomponent(): void {
    if (!this.label.text.value) {
      this.subComponents.label?.destroy();
      return;
    }

    if (this.subComponents.label) {
      return;
    }

    const label = new Label({
      parent: this,
      theme: this.theme,
      zIndex: this.zIndex,
      rectangle: this.rectangle,
      overwriteRectangle: true,
      text: this.label.text,
      align: this.label.align,
    });

    label.state = this.state;
    label.style = this.style;

    label.subComponentOf = this;
    this.subComponents.label = label;
  }
}
