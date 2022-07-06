import { BoxComponent } from "./box.ts";
import { ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";

export interface ButtonComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  label?: string;
}

export class ButtonComponent extends BoxComponent {
  label?: string;
  #lastInteraction = 0;

  constructor(options: ButtonComponentOptions) {
    super(options);
    this.label = options.label;
  }

  draw() {
    super.draw();

    if (this.label) {
      const { canvas } = this.tui;
      const { column, row, width, height } = this.rectangle;

      canvas.draw(
        column + (width / 2) - (this.label.length / 2),
        row + (height / 2),
        this.style(this.label),
      );
    }
  }

  interact() {
    const now = Date.now();
    const interactionDelay = now - this.#lastInteraction;

    this.state = this.state === "focused" && interactionDelay < 200
      ? "active"
      : "focused";

    this.#lastInteraction = now;
  }
}
