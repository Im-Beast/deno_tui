// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { ComponentEventMap, PlaceComponentOptions } from "../component.ts";
import { BoxComponent } from "./box.ts";
import { EmitterEvent } from "../event_emitter.ts";

import { insertAt } from "../utils/strings.ts";
import { clamp } from "../utils/numbers.ts";

import type { EventRecord } from "../event_emitter.ts";
import { emptyStyle, Style, Theme } from "../theme.ts";
import type { DeepPartial } from "../types.ts";

export interface TextboxTheme extends Theme {
  placeholder: Style;
}

/** Interface defining object that {TextboxComponent}'s constructor can interpret */
export interface TextboxComponentOptions extends PlaceComponentOptions {
  theme?: DeepPartial<TextboxTheme>;
  /** Whether texbox should allow new lines */
  multiline?: boolean;
  /** Whether textbox value should be starred ("*") */
  hidden?: boolean;
  /** Current value of textbox */
  value?: string;
  /** Text displayed as a proposition of example text input */
  placeholder?: string;
}

/** Complementary interface defining what's accessible in {TextboxComponent} class in addition to {TextboxComponentOptions} */
export interface TextboxComponentPrivate {
  theme: TextboxTheme;
  multiline: boolean;
  hidden: boolean;
  value: string;
}

/** Implementation for {TextboxComponent} class */
export type TextboxComponentImplementation = TextboxComponentOptions & TextboxComponentPrivate;

/** EventMap that {TextboxComponent} uses */
export type TextboxComponentEventMap = ComponentEventMap & {
  valueChange: EmitterEvent<[TextboxComponent<EventRecord>]>;
};

/**
 * Component that allows user to input text.
 * It implements most important ways to manipulate inputting text e.g.:
 *  - Arrows - Move cursor in specified direction
 *  - Return – Create new line
 *  - Home/End - Go to the start/end of the line
 *  - PgUp/PgDown - Go to the start/end of the text input
 *  - Delete/Backspace - Delete preceding/subsequent character
 */
export class TextboxComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends BoxComponent<EventMap & TextboxComponentEventMap> implements TextboxComponentImplementation {
  declare theme: TextboxTheme;

  #value: string[] = [];
  #placeholder?: string[];

  cursorPosition: {
    x: number;
    y: number;
  };
  multiline: boolean;
  hidden: boolean;
  placeholder?: string;

  constructor(options: TextboxComponentOptions) {
    super(options);
    this.multiline = options.multiline ?? false;
    this.hidden = options.hidden ?? false;
    this.value = options.value ?? "";
    this.cursorPosition = { x: this.#value.at(-1)?.length ?? 0, y: this.#value.length - 1 ?? 0 };
    this.placeholder = options.placeholder;
    if (this.placeholder) {
      this.#placeholder = this.placeholder.split("\n");
    }

    this.theme.placeholder = options.theme?.placeholder ?? emptyStyle;

    this.on("keyPress", (keyPress) => {
      const { key, ctrl, meta } = keyPress;
      if (ctrl || meta) return;

      let { x, y } = this.cursorPosition;

      const startValue = this.value;

      if (key.length === 1) {
        this.#value[y] = insertAt(this.#value[y], x, key);
        ++x;
      } else {
        const currentLine = this.#value[y];
        const endOfLine = x === currentLine.length;

        switch (key) {
          case "space":
            this.#value[y] = insertAt(this.#value[y], x, " ");
            ++x;
            break;
          case "tab":
            this.#value[y] = insertAt(this.#value[y], x, "  ");
            ++x;
            break;
          case "up":
            --y;
            break;
          case "down":
            ++y;
            break;
          case "left":
            --x;
            break;
          case "right":
            ++x;
            break;
          case "home":
            x = 0;
            break;
          case "end":
            x = currentLine.length;
            break;
          case "return":
            if (!endOfLine) {
              const splitLines = [currentLine.slice(0, x), currentLine.slice(x)];
              this.#value.splice(y, 1, ...splitLines);
              x = 0;
            }
            ++y;
            break;
          case "delete":
            if (!endOfLine) {
              this.#value[y] = currentLine.slice(0, x) + currentLine.slice(x + 1);
            } else if (this.#value.length > y + 1) {
              const combinedLines = currentLine + this.#value[y + 1];
              this.#value.splice(y, 2, combinedLines);
            }
            break;
          case "backspace":
            if (y - 1 >= 0 && x === 0) {
              const previousLine = this.#value[y - 1];
              const combinedLines = previousLine + currentLine;
              this.#value.splice(y - 1, 2, combinedLines);
              --y;
              x = previousLine.length;
            } else if (x !== 0) {
              this.#value[y] = currentLine.slice(0, x - 1) + currentLine.slice(x);
              --x;
            }
            break;
        }
      }

      y = Math.max(y, 0);
      this.#value[y] ||= "";
      x = clamp(x, 0, this.#value[y].length);
      this.cursorPosition = { x, y };

      if (this.value !== startValue) {
        this.emit("valueChange", this);
      }
    });
  }

  get value(): string {
    return this.#value.join("\n");
  }

  set value(value: string) {
    const split = value.split("\n");
    this.#value = this.multiline ? split : [split.join("")];
  }

  draw(): void {
    super.draw();

    if (!this.value && !this.placeholder) return;
    const isPlaceholder = !this.value;
    const textArray = isPlaceholder ? this.#placeholder! : this.#value;

    const style = isPlaceholder && this.theme.placeholder
      ? (text: string) => this.style(this.theme.placeholder(text).replaceAll("\x1b[0m", ""))
      : this.style;

    const { canvas } = this.tui;
    const { column, row, width, height } = this.rectangle;
    const { x, y } = this.cursorPosition;

    const offsetX = Math.max(x - width + 1, 0);
    const offsetY = Math.max(y - height + 1, 0);

    for (const [i, line] of textArray.entries()) {
      if (i < offsetY) continue;
      if (i - offsetY >= height) break;

      const lineText = line.slice(offsetX, offsetX + width);

      canvas.draw(
        column,
        row + i - offsetY,
        style(this.hidden ? "*".repeat(lineText.length) : lineText),
      );
    }

    if (this.state === "base") return;

    canvas.draw(
      column + Math.min(x, width - 1),
      row + Math.min(y, height - 1),
      style("\x1b[7m" + (textArray[y][x] ?? " ") + "\x1b[0m"),
    );
  }

  interact(): void {
    this.state = "focused";
  }
}
