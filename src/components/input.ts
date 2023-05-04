// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Box } from "./box.ts";
import { ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";
import { TextObject } from "../canvas/text.ts";
import { Theme } from "../theme.ts";
import { DeepPartial } from "../types.ts";
import { cropToWidth, insertAt } from "../utils/strings.ts";
import { clamp } from "../utils/numbers.ts";
import { BaseSignal, Computed, Signal } from "../signals.ts";
import { signalify } from "../utils/signals.ts";

export interface InputTheme extends Theme {
  value: Theme;
  cursor: Theme;
  placeholder: Theme;
}

export interface InputOptions extends ComponentOptions {
  text?: string | BaseSignal<string>;
  validator?: RegExp | BaseSignal<RegExp>;
  password?: boolean | BaseSignal<boolean>;
  placeholder?: string | BaseSignal<string>;
  multiCodePointSupport?: boolean | BaseSignal<boolean>;

  theme: DeepPartial<InputTheme, "cursor">;
}

export class Input extends Box {
  declare drawnObjects: {
    box: BoxObject;
    text: TextObject;
    cursor: TextObject;
  };
  declare theme: InputTheme;

  text: BaseSignal<string>;
  password: BaseSignal<boolean>;
  cursorPosition: BaseSignal<number>;
  validator: BaseSignal<RegExp | undefined>;
  multiCodePointSupport: BaseSignal<boolean>;
  placeholder: BaseSignal<string | undefined>;

  constructor(options: InputOptions) {
    super(options);

    this.theme.value ??= this.theme;
    this.theme.placeholder ??= this.theme.value;

    this.cursorPosition = new Signal(0);

    this.text = signalify(options.text ?? "");
    this.validator = signalify(options.validator);
    this.placeholder = signalify(options.placeholder);
    this.password = signalify(options.password ?? false);
    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);

    this.on("keyPress", ({ key, ctrl, meta }) => {
      if (ctrl || meta) return;

      const cursorPosition = this.cursorPosition.peek();
      const validator = this.validator.peek();
      const value = this.text.peek();

      let character = "";
      switch (key) {
        case "backspace":
          if (cursorPosition === 0) return;
          this.text.value = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
          this.cursorPosition.value = clamp(cursorPosition - 1, 0, value.length);
          return;
        case "delete":
          this.text.value = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
          return;
        case "left":
          this.cursorPosition.value = clamp(cursorPosition - 1, 0, value.length);
          return;
        case "right":
          this.cursorPosition.value = clamp(cursorPosition + 1, 0, value.length);
          return;
        case "home":
          this.cursorPosition.value = 0;
          return;
        case "end":
          this.cursorPosition.value = value.length;
          return;
        case "space":
          character = " ";
          break;
        case "tab":
          character = "\t";
          break;
        default:
          if (key.length > 1) return;
          character = key;
      }

      if (validator && !validator?.test(character)) return;
      this.text.value = insertAt(value, cursorPosition, character);
      this.cursorPosition.value = clamp(cursorPosition + 1, 0, this.text.value.length);
    });
  }

  draw(): void {
    super.draw();

    const { canvas } = this.tui;

    const textRectangle = { column: 0, row: 0, width: 0 };
    const text = new TextObject({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      multiCodePointSupport: this.multiCodePointSupport,
      style: new Computed(() =>
        this.theme[!this.text.value && this.placeholder ? "placeholder" : "value"][this.state.value]
      ),
      value: new Computed(() => {
        const password = this.password.value;
        const placeholder = this.placeholder.value;
        const cursorPosition = this.cursorPosition.value;
        const value = this.text.value.replace("\t", " ");
        const { width } = this.rectangle.value;

        if (!value && placeholder) {
          return cropToWidth(placeholder, width);
        }

        const offsetX = cursorPosition - width + 1;
        return password
          ? "*".repeat(Math.min(value.length, width))
          : cropToWidth(offsetX > 0 ? value.slice(offsetX, cursorPosition) : value, width);
      }),
      rectangle: new Computed(() => {
        const { row, column } = this.rectangle.value;
        textRectangle.column = column;
        textRectangle.row = row;
        return textRectangle;
      }),
    });

    const cursorRectangle = { column: 0, row: 0, width: 1, height: 1 };
    const cursor = new TextObject({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      multiCodePointSupport: this.multiCodePointSupport,
      value: new Computed(() => {
        const value = this.text.value;
        const placeholder = this.placeholder.value;
        const cursorPosition = this.cursorPosition.value;
        return (value ? value[cursorPosition] : placeholder?.[cursorPosition]) ?? " ";
      }),
      style: new Computed(() => this.theme.cursor[this.state.value]),
      rectangle: new Computed(() => {
        const cursorPosition = this.cursorPosition.value;
        const { row, column, width } = this.rectangle.value;
        cursorRectangle.column = column + Math.min(cursorPosition, width - 1);
        cursorRectangle.row = row;
        return cursorRectangle;
      }),
    });

    this.drawnObjects.text = text;
    this.drawnObjects.cursor = cursor;

    text.draw();
    cursor.draw();
  }

  interact(method: "keyboard" | "mouse"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state.value = this.state.peek() === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }
}
