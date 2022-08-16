// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { ButtonComponent } from "./button.ts";
import { PlaceComponentOptions } from "../component.ts";

import { EventRecord } from "../utils/typed_event_target.ts";

enum Mark {
  Check = "✓",
  Cross = "✗",
}

/** Interface defining object that {CheckboxComponent}'s constructor can interpret */
export interface CheckboxComponentOptions extends PlaceComponentOptions {
  value?: boolean;
}

/** Complementary interface defining what's accessible in {CheckboxComponent} class in addition to {CheckboxComponentOptions} */
export interface CheckboxComponentPrivate {
  value: boolean;
}

/** Implementation for {CheckboxComponent} class */
export type CheckboxComponentImplementation = CheckboxComponentPrivate;

/** Component that allows user to toggle input */
export class CheckboxComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends ButtonComponent<EventMap> implements CheckboxComponentImplementation {
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
