// Copyright 2022 Im-Beast. All rights reserved. MIT license.
import { ButtonComponent } from "./button.ts";
import { BoxComponentOptions } from "./box.ts";
import { EventRecord } from "../utils/typed_event_target.ts";

export enum Mark {
  Check = "✓",
  Cross = "✗",
}

export interface CheckboxComponentOptions extends BoxComponentOptions {
  value?: boolean;
}

export class CheckboxComponent<EventMap extends EventRecord = Record<never, never>> extends ButtonComponent<EventMap> {
  #lastInteraction = 0;
  #value: boolean;
  label: string;

  constructor(options: CheckboxComponentOptions) {
    super(options);
    this.#value = options.value ?? false;
    this.label = this.value ? Mark.Check : Mark.Cross;
  }

  get value() {
    return this.#value;
  }

  set value(value: boolean) {
    this.label = value ? Mark.Check : Mark.Cross;
    this.state = value ? "active" : "base";
    this.#value = value;
  }

  draw() {
    super.draw();
  }

  interact(method?: "mouse" | "keyboard") {
    const now = Date.now();
    const interactionDelay = now - this.#lastInteraction;

    if (method === "keyboard" || interactionDelay < 500) {
      this.value = !this.value;
    } else {
      this.state = "focused";
    }

    this.#lastInteraction = now;
  }
}
