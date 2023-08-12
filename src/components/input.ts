// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Box } from "./box.ts";

import { Theme } from "../theme.ts";
import { DeepPartial } from "../types.ts";
import { ComponentOptions } from "../component.ts";

import { Computed, Signal, SignalOfObject } from "../signals/mod.ts";

import { BoxPainter } from "../canvas/painters/box.ts";
import { TextPainter } from "../canvas/painters/text.ts";

import { clamp } from "../utils/numbers.ts";
import { signalify } from "../utils/signals.ts";
import { cropToWidth, insertAt } from "../utils/strings.ts";

export interface InputTheme extends Theme {
  value: Theme;
  cursor: Theme;
  placeholder: Theme;
}

export interface InputRectangle {
  column: number;
  row: number;
  width: number;
  height?: 1;
}

export interface InputOptions extends Omit<ComponentOptions, "rectangle"> {
  text?: string | Signal<string>;
  validator?: RegExp | Signal<RegExp | undefined>;
  password?: boolean | Signal<boolean>;
  placeholder?: string | Signal<string | undefined>;
  multiCodePointSupport?: boolean | Signal<boolean>;
  rectangle: InputRectangle | SignalOfObject<InputRectangle>;
  theme: DeepPartial<InputTheme, "cursor">;
}

/**
 * Component for creating interactive text input
 *
 * This component is 1 character high only!
 *
 * If you need multiline input use `TextBox` component.
 *
 * @example
 * ```ts
 * new Input({
 *  parent: tui,
 *  placeholder: "type here",
 *  theme: {
 *    base: crayon.bgGreen,
 *    focused: crayon.bgLightGreen,
 *    active: crayon.bgYellow,
 *  },
 *  rectangle: {
 *    column: 1,
 *    row: 1,
 *    width: 10,
 *  },
 *  zIndex: 0,
 * });
 * ```
 *
 * It supports validating input, e.g. number input would look like this:
 * @example
 * ```ts
 * new Input({
 *  ...,
 *  validator: /\d+/,
 * });
 * ```
 *
 * You can also define whether text should be censored with `*` character by specifying `password` property.
 * @example
 * ```ts
 * new Input({
 *  ...,
 *  password: true,
 * });
 * ```
 *
 * If you need to use emojis or other multi codepoint characters set `multiCodePointSupport` property to true.
 * @example
 * ```ts
 * new Input({
 *  ...,
 *  placeholder: "🧡",
 *  multiCodePointCharacter: true,
 * });
 * ```
 */
export class Input extends Box {
  declare drawnObjects: {
    box: BoxPainter;
    text: TextPainter<string[]>;
    cursor: TextPainter<string[]>;
  };
  declare theme: InputTheme;

  text: Signal<string>;
  password: Signal<boolean>;
  cursorPosition: Signal<number>;
  validator: Signal<RegExp | undefined>;
  multiCodePointSupport: Signal<boolean>;
  placeholder: Signal<string | undefined>;

  constructor(options: InputOptions) {
    const { rectangle } = options;

    if ("value" in rectangle) {
      rectangle.value.height = 1;
    } else {
      rectangle.height = 1;
    }

    super(options as ComponentOptions);

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

      if (validator && !validator.test(character)) return;
      this.text.value = insertAt(value, cursorPosition, character);
      this.cursorPosition.value = clamp(cursorPosition + 1, 0, this.text.value.length);
    });
  }

  draw(): void {
    super.draw();

    const { canvas } = this.tui;

    const textRectangle = { column: 0, row: 0, width: 0, height: 0 };
    const textText = [""];
    const text = new TextPainter({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      multiCodePointSupport: this.multiCodePointSupport,
      style: new Computed(() =>
        this.theme[!this.text.value && this.placeholder ? "placeholder" : "value"][this.state.value]
      ),
      text: new Computed(() => {
        const password = this.password.value;
        const placeholder = this.placeholder.value;
        const cursorPosition = this.cursorPosition.value;
        const value = this.text.value.replace("\t", " ");
        const { width } = this.rectangle.value;

        if (!value && placeholder) {
          textText[0] = cropToWidth(placeholder, width);
          return textText;
        }

        const offsetX = cursorPosition - width + 1;
        textText[0] = password
          ? "*".repeat(Math.min(value.length, width))
          : cropToWidth(offsetX > 0 ? value.slice(offsetX, cursorPosition) : value, width);

        return textText;
      }),
      rectangle: new Computed(() => {
        const { row, column } = this.rectangle.value;
        textRectangle.column = column;
        textRectangle.row = row;
        return textRectangle;
      }),
    });

    const cursorRectangle = { column: 0, row: 0, width: 1, height: 1 };
    const cursorValue = [""];
    const cursor = new TextPainter({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      multiCodePointSupport: this.multiCodePointSupport,
      text: new Computed(() => {
        const value = this.text.value;
        const placeholder = this.placeholder.value;
        const cursorPosition = this.cursorPosition.value;
        cursorValue[0] = (value ? value[cursorPosition] : placeholder?.[cursorPosition]) ?? " ";
        return cursorValue;
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
