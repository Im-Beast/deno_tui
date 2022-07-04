import { BoxComponent } from "./box.ts";
import { ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";

export interface ButtonComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  label?: string;
}

export class ButtonComponent extends BoxComponent {
  declare label?: string;

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
        row + (height / 2) - 1,
        this.style(this.label),
      );
    }
  }

  #lastInteraction = 0;
  interact() {
    const now = Date.now();
    if (this.state === "focused" && now - this.#lastInteraction < 500) {
      this.state = "active";
    } else {
      this.state = "focused";
    }

    this.#lastInteraction = now;
  }
}
