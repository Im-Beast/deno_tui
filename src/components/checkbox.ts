// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Button } from "./button.ts";
import { PlaceComponentOptions } from "../component.ts";

import type { EventRecord } from "../event_emitter.ts";

enum Mark {
  Check = "✓",
  Cross = "✗",
}

/** Interface defining object that {CheckboxComponent}'s constructor can interpret */
export interface CheckboxOptions extends PlaceComponentOptions {
  /** Whether checkbox is checked or not */
  value?: boolean;
}

/** Complementary interface defining what's accessible in {CheckboxComponent} class in addition to {CheckboxComponentOptions} */
export interface CheckboxPrivate {
  value: boolean;
}

/** Implementation for {CheckboxComponent} class */
export type CheckboxImplementation = CheckboxPrivate;

/** Component that allows user to toggle input */
export class Checkbox<
  EventMap extends EventRecord = Record<never, never>,
> extends Button<EventMap> implements CheckboxImplementation {
  #value: boolean;

  label: string;

  constructor(options: CheckboxOptions) {
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

  interact(_method?: "mouse" | "keyboard"): void {
    this.state = this.state === "focused" || this.state === "active" ? "active" : "focused";
    if (this.state === "active") this.value = !this.value;
  }
}
