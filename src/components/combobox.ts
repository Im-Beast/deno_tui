import { BoxComponent } from "./box.ts";
import { ButtonComponent } from "./button.ts";
import { Component, ComponentOptions } from "../component.ts";
import { Rectangle } from "../types.ts";
import { EventRecord } from "../util.ts";
import { ComponentEvent } from "../events.ts";

export interface ComboboxComponentOptions<
  OptionType extends string[] = string[],
> extends ComponentOptions {
  rectangle: Rectangle;
  label: string;
  options: OptionType;
}

export type ComboboxComponentEventMap = {
  valueChange: ComponentEvent<"valuechange">;
};

export class ComboboxComponent<
  OptionType extends string[] = string[],
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap & ComboboxComponentEventMap> {
  #lastInteraction = 0;
  #temporaryComponents: Component[] = [];
  label: string;
  options: string[];
  option: OptionType[number] | undefined;

  constructor(options: ComboboxComponentOptions<OptionType>) {
    super(options);
    this.options = options.options;
    this.label = options.label ?? this.options[0];
    this.option = options.label ? undefined : this.options[0];
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
        });

        button.addEventListener("stateChange", ({ component }) => {
          const { state } = component;
          if (state !== "active") return;
          this.label = option;
          this.option = option;
          this.dispatchEvent(new ComponentEvent("valueChange", this));
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
