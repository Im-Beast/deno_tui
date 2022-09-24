// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Component, ComponentOptions } from "../component.ts";
import { BoxComponent } from "./box.ts";
import { ButtonComponent } from "./button.ts";
import { EmitterEvent } from "../event_emitter.ts";

import type { Rectangle } from "../types.ts";
import type { EventRecord } from "../event_emitter.ts";

/** Interface defining object that {ComboboxComponent}'s constructor can interpret */
export interface ComboboxComponentOptions<OptionType extends string[] = string[]> extends ComponentOptions {
  rectangle: Rectangle;
  /** Text displayed on combobox by default */
  label?: string;
  /** Possible values of combobox */
  options: OptionType;
}

/** Complementary interface defining what's accessible in {ComboboxComponent} class in addition to {ComboboxComponentOptions} */
export interface ComboboxComponentPrivate<OptionType extends string[] = string[]> {
  label: string;
  /** Currently selected option */
  value?: OptionType[number];
}

/** Implementation for {ComboboxComponent} class */
export type ComboboxComponentImplementation = ComboboxComponentOptions & ComboboxComponentPrivate;

/** EventMap that {ComboboxComponent} uses */
export type ComboboxComponentEventMap = {
  valueChange: EmitterEvent<[ComboboxComponent<string[], EventRecord>]>;
};

/**
 * Component that allows user to input value by selecting one from available options.
 * If `label` isn't provided then first value from `options` will be used.
 */
export class ComboboxComponent<
  OptionType extends string[] = string[],
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap & ComboboxComponentEventMap> implements ComboboxComponentImplementation {
  #lastInteraction = 0;
  #temporaryComponents: Component[] = [];

  label: string;
  options: string[];
  option?: OptionType[number];

  constructor(options: ComboboxComponentOptions<OptionType>) {
    super(options);
    this.options = options.options;
    this.label = options.label ?? this.options[0];
    this.option = options.label ? undefined : this.options[0];
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
      );
    }
  }

  interact(): void {
    const now = Date.now();
    const interactionDelay = now - this.#lastInteraction;

    this.state = this.state === "focused" && interactionDelay < 500 ? "active" : "focused";

    if (this.state === "active") {
      const { column, row, width, height } = this.rectangle;

      for (const [i, option] of this.options.entries()) {
        const button = new ButtonComponent({
          tui: this.tui,
          rectangle: {
            column,
            row: row + ((i + 1) * height),
            height,
            width,
          },
          label: option,
          theme: this.theme,
          zIndex: this.zIndex,
        });

        button.on("stateChange", (component) => {
          const { state } = component;
          if (state !== "active") return;
          this.label = option;
          this.option = option;
          this.emit("valueChange", this);
          this.interact();
        });

        this.#temporaryComponents.push(button);
      }
    } else {
      for (const component of this.#temporaryComponents) {
        component.remove();
      }
    }

    this.#lastInteraction = now;
  }
}
