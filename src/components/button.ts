// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Box } from "./box.ts";
import { PlaceComponentOptions } from "../component.ts";

import type { EventRecord } from "../event_emitter.ts";
import { DrawBoxOptions, DrawTextOptions } from "../canvas.ts";
import { textWidth } from "../utils/strings.ts";

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
  drawnObjects: {
    box?: DrawBoxOptions<true>;
    label?: DrawTextOptions<true>;
  };

  constructor(options: ButtonOptions) {
    super(options);
    this.label = options.label;
    this.drawnObjects = {};
  }

  update(): void {
    super.update();

    const { label } = this.drawnObjects;

    if (this.refresh && label) {
      const { column, row, width, height } = this.rectangle;
      label.rectangle.column = ~~(column + width / 2 - textWidth(this.label!) / 2);
      label.rectangle.row = ~~(row + height / 2);
      label.zIndex = this.zIndex;
      label.style = this.style;
      label.dynamic = this.forceDynamicDrawing;
      label.value = this.label ?? "";

      label.rendered = false;
    }
  }

  draw(): void {
    super.draw();

    const { drawnObjects, style, label, zIndex } = this;
    const { canvas } = this.tui;

    if (drawnObjects.label) {
      canvas.drawnObjects.remove(drawnObjects.label);
    }

    if (label) {
      const { column, row, width, height } = this.rectangle;

      this.drawnObjects.label = canvas.drawText({
        rectangle: {
          column: ~~(column + (width / 2) - (label.length / 2)),
          row: ~~(row + (height / 2)),
        },
        value: label,
        style,
        zIndex,
      });
    }
  }

  interact(method?: "mouse" | "keyboard"): void {
    const now = Date.now();
    const interactionDelay = now - this.#lastInteraction;

    this.state = this.state === "focused" && (interactionDelay < 500 || method === "keyboard") ? "active" : "focused";

    this.#lastInteraction = now;
  }
}
