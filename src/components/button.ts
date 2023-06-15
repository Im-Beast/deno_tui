// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { ComponentOptions } from "../component.ts";
import { Box } from "./box.ts";

import type { BoxObject } from "../canvas/box.ts";
import { Label, LabelAlign, LabelRectangle } from "./label.ts";
import { Signal, SignalOfObject } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";

const centerAlign: LabelAlign = {
  horizontal: "center",
  vertical: "center",
};

export interface ButtonOptions extends ComponentOptions {
  label?: {
    text: string | Signal<string>;
    align?: LabelAlign | SignalOfObject<LabelAlign>;
  };
}

/**
 * Component for creating interactive button
 *
 * @example
 * ```ts
 * new Button({
 *  parent: tui,
 *  label: { text: "click\nme" },
 *  theme: {
 *    base: crayon.bgGreen,
 *    focused: crayon.bgLightGreen,
 *    active: crayon.bgYellow,
 *  },
 *  rectangle: {
 *    column: 1,
 *    row: 1,
 *    height: 5,
 *    width: 10,
 *  },
 *  zIndex: 0,
 * });
 * ```
 */
export class Button extends Box {
  declare drawnObjects: { box: BoxObject };
  declare subComponents: { label?: Label };
  label: {
    text: Signal<string>;
    align: Signal<LabelAlign>;
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
      rectangle: this.rectangle as Signal<LabelRectangle>,
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
