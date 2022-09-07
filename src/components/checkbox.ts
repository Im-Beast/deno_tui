// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { ButtonComponent } from "./button.ts";
import { PlaceComponentOptions } from "../component.ts";
import { EmitterEvent } from "../event_emitter.ts";

enum Mark {
  Check = "✓",
  Cross = "✗",
}

/** Interface defining object that {CheckboxComponent}'s constructor can interpret */
export interface CheckboxComponentOptions extends PlaceComponentOptions {
  /** Whether checkbox is checked or not */
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
  EventMap extends Record<string, EmitterEvent> = Record<never, never>,
> extends ButtonComponent<EventMap> implements CheckboxComponentImplementation {
  #value: boolean;
  label: string;

  constructor(options: CheckboxComponentOptions) {
    super(options);
    this.#value = options.value ?? false;
    this.label = this.value ? Mark.Check : Mark.Cross;
  }

  /** Whether checkbox is checked or not */
  get value(): boolean {
    return this.#value;
  }

  set value(value: boolean) {
    this.label = value ? Mark.Check : Mark.Cross;
    this.state = value ? "active" : "base";
    this.#value = value;
  }

  draw(): void {
    super.draw();
  }

  interact(_method?: "mouse" | "keyboard"): void {
    this.state = this.state === "focused" || this.state === "active" ? "active" : "focused";
    if (this.state === "active") this.value = !this.value;
  }
}
