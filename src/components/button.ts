// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { BoxComponent } from "./box.ts";
import { PlaceComponentOptions } from "../component.ts";

import { EventRecord } from "../utils/typed_event_target.ts";

/** Interface defining object that {SliderComponent}'s constructor can interpret */
export interface ButtonComponentOptions extends PlaceComponentOptions {
  /** Text displayed on the center of the button */
  label?: string;
}

/** Implementation for {ButtonComponent} class */
export type ButtonComponentImplementation = ButtonComponentOptions;

/** Component that can be pressed */
export class ButtonComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap> implements ButtonComponentImplementation {
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

  interact(method?: "mouse" | "keyboard") {
    const now = Date.now();
    const interactionDelay = now - this.#lastInteraction;

    this.state = this.state === "focused" && (interactionDelay < 500 || method === "keyboard") ? "active" : "focused";

    this.#lastInteraction = now;
  }
}
