// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Box } from "./box.ts";
import { PlaceComponentOptions } from "../component.ts";

import type { EventRecord } from "../event_emitter.ts";

/** Interface defining object that {ButtonComponent}'s constructor can interpret */
export interface ButtonOptions extends PlaceComponentOptions {
  /** Text displayed on the center of the button */
  label?: string;
}

/** Implementation for {ButtonComponent} class */
export type ButtonImplementation = ButtonOptions;

/** Component that can be pressed */
export class Button<
  EventMap extends EventRecord = Record<never, never>,
> extends Box<EventMap> implements ButtonImplementation {
  #lastInteraction = 0;

  label?: string;

  constructor(options: ButtonOptions) {
    super(options);
    this.label = options.label;
  }

  draw(): void {
    super.draw();

    if (this.label) {
      const { style } = this;
      const { canvas } = this.tui;
      const { column, row, width, height } = this.rectangle;

      canvas.draw(
        column + (width / 2) - (this.label.length / 2),
        row + (height / 2),
        style(this.label),
        this,
      );
    }
  }

  interact(method?: "mouse" | "keyboard"): void {
    const now = Date.now();
    const interactionDelay = now - this.#lastInteraction;

    this.state = this.state === "focused" && (interactionDelay < 500 || method === "keyboard") ? "active" : "focused";

    this.#lastInteraction = now;
  }
}
