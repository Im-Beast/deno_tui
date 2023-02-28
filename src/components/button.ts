import { ComponentOptions } from "../component.ts";
import { Box } from "./box.ts";

import type { BoxObject } from "../canvas/box.ts";
import { Label, LabelAlign } from "./label.ts";

export interface ButtonOptions extends ComponentOptions {
  label?: {
    value: string;
    align?: LabelAlign;
  };
}

export class Button extends Box {
  declare drawnObjects: { box: BoxObject };
  declare subComponents: { label?: Label };
  label?: {
    value: string;
    align?: LabelAlign;
  };

  constructor(options: ButtonOptions) {
    super(options);
    this.label = options.label;
  }

  update(): void {
    super.update();

    const { label } = this.subComponents;

    if (this.label && !label) {
      this.draw();
    } else if (label) {
      if (!this.label) {
        label.remove();
        return;
      }

      label.state = this.state;
      label.theme = this.theme;
      label.value = this.label.value;
      label.zIndex = this.zIndex;
      label.rectangle = this.rectangle;

      if (this.label.align) {
        label.align = this.label.align;
      }
    }
  }

  draw(): void {
    super.draw();

    if (this.label) {
      const label = new Label({
        parent: this,
        theme: this.theme,
        value: this.label.value,
        zIndex: this.zIndex,
        rectangle: this.rectangle,
        align: this.label.align ?? {
          horizontal: "center",
          vertical: "center",
        },
      });

      label.subComponentOf = this;

      this.subComponents.label = label;
      this.children.push(label);
    }
  }

  interact(method: "mouse" | "keyboard"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state = this.state === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }
}
