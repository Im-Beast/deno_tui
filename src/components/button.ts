import { BoxComponent } from "./box.ts";
import { ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";
import { EventRecord } from "../util.ts";

export interface ButtonComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
  label?: string;
}

export class ButtonComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap> {
  #lastInteraction = 0;
  label?: string;

  constructor(options: ButtonComponentOptions) {
    super(options);
    this.label = options.label;
  }

  draw() {
    super.draw();

    if (this.label) {
      const { style } = this;
      const { canvas } = this.tui;
      const { column, row, width, height } = this.rectangle;

      canvas.draw(
        column + (width / 2) - (this.label.length / 2),
        row + (height / 2),
        style(this.label),
      );
    }
  }

  interact() {
    const now = Date.now();
    const interactionDelay = now - this.#lastInteraction;

    this.state = this.state === "focused" && interactionDelay < 500 ? "active" : "focused";

    this.#lastInteraction = now;
  }
}
