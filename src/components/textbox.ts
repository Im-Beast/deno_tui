// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { ComponentEventMap, PlaceComponentOptions } from "../component.ts";
import { Box } from "./box.ts";
import { EmitterEvent } from "../event_emitter.ts";

import { insertAt } from "../utils/strings.ts";
import { clamp } from "../utils/numbers.ts";

import type { EventRecord } from "../event_emitter.ts";
import { emptyStyle, hierarchizeTheme, Style, Theme } from "../theme.ts";
import type { DeepPartial, KeyPress } from "../types.ts";
import { DrawBoxOptions } from "../canvas.ts";

export interface TextboxTheme extends Theme {
  /** Style for numbers counting textbox rows */
  lineNumbers: Theme;
  /** Style for currently selected text row */
  highlightedLine: Theme;
  /** Style for placeholder text */
  placeholder: Style;
}

/** Interface defining object that {Textbox}'s constructor can interpret */
export interface TextboxOptions extends PlaceComponentOptions {
  theme?: DeepPartial<TextboxTheme>;
  /** Whether texbox should allow new lines */
  multiline?: boolean;
  /** Whether textbox value should be starred ("*") */
  hidden?: boolean;
  /** Current value of textbox */
  value?: string;
  /** Text displayed as a proposition of example text input */
  placeholder?: string;
  /** Whether to highlight currently selected text row */
  lineHighlighting?: boolean;
  /** Whether to number textbox rows */
  lineNumbering?: boolean;
  /** Function that defines what key does what while textbox is focused/active */
  keyboardHandler?: (textbox: Textbox<EventRecord>) => (keyPress: KeyPress) => void;
}

/** Complementary interface defining what's accessible in {Textbox} class in addition to {TextboxOptions} */
export interface TextboxPrivate {
  theme: TextboxTheme;
  lineHighlighting: boolean;
  lineNumbering: boolean;
  multiline: boolean;
  hidden: boolean;
  value: string;
}

/** Implementation for {Textbox} class */
export type TextboxImplementation = TextboxOptions & TextboxPrivate;

/** EventMap that {Textbox} uses */
export type TextboxEventMap = ComponentEventMap & {
  valueChange: EmitterEvent<[Textbox<EventRecord>]>;
};

/** Default keyboard handler for {Textbox} */
export function textboxKeyboardHandler(textbox: Textbox<EventRecord>): (keyPress: KeyPress) => void {
  return (keyPress) => {
    const { key, ctrl, meta } = keyPress;
    if (ctrl || meta) return;

    let { x, y } = textbox.cursorPosition;

    const startValue = textbox.value;

    if (key.length === 1) {
      textbox.rawValue[y] = insertAt(textbox.rawValue[y], x, key);
      ++x;
    } else {
      const currentLine = textbox.rawValue[y];
      const endOfLine = x === currentLine.length;

      switch (key) {
        case "space":
          textbox.rawValue[y] = insertAt(textbox.rawValue[y], x, " ");
          ++x;
          break;
        case "tab":
          textbox.rawValue[y] = insertAt(textbox.rawValue[y], x, "  ");
          ++x;
          break;
        case "up":
          --y;
          break;
        case "down":
          y = Math.min(++y, textbox.rawValue.length - 1);
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
          if (!textbox.multiline) break;

          if (!endOfLine) {
            const splitLines = [currentLine.slice(0, x), currentLine.slice(x)];
            textbox.rawValue.splice(y, 1, ...splitLines);
            x = 0;
          }
          ++y;
          break;
        case "delete":
          if (!endOfLine) {
            textbox.rawValue[y] = currentLine.slice(0, x) + currentLine.slice(x + 1);
          } else if (textbox.rawValue.length > y + 1) {
            const combinedLines = currentLine + textbox.rawValue[y + 1];
            textbox.rawValue.splice(y, 2, combinedLines);
          }
          break;
        case "backspace":
          if (y - 1 >= 0 && x === 0) {
            const previousLine = textbox.rawValue[y - 1];
            const combinedLines = previousLine + currentLine;
            textbox.rawValue.splice(y - 1, 2, combinedLines);
            --y;
            x = previousLine.length;
          } else if (x !== 0) {
            textbox.rawValue[y] = currentLine.slice(0, x - 1) + currentLine.slice(x);
            --x;
          }
          break;
      }
    }

    y = Math.max(y, 0);
    textbox.rawValue[y] ||= "";
    x = clamp(x, 0, textbox.rawValue[y].length);
    textbox.cursorPosition = { x, y };

    if (textbox.value !== startValue) {
      textbox.emit("valueChange", textbox);
    }
  };
}

/**
 * Component that allows user to input text.
 * It implements most important ways to manipulate inputting text e.g.:
 *  - Arrows - Move cursor in specified direction
 *  - Return – Create new line
 *  - Home/End - Go to the start/end of the line
 *  - PgUp/PgDown - Go to the start/end of the text input
 *  - Delete/Backspace - Delete preceding/subsequent character
 */
export class Textbox<
  EventMap extends EventRecord = Record<never, never>,
> extends Box<EventMap & TextboxEventMap> implements TextboxImplementation {
  declare theme: TextboxTheme;

  rawValue: string[] = [];
  #placeholder?: string[];

  cursorPosition: {
    x: number;
    y: number;
  };
  multiline: boolean;
  hidden: boolean;
  lineHighlighting: boolean;
  lineNumbering: boolean;
  placeholder?: string;

  drawnObjects: {
    box?: DrawBoxOptions<true>;
  };

  constructor(options: TextboxOptions) {
    super(options);
    this.multiline = options.multiline ?? false;
    this.lineHighlighting = options.lineHighlighting ?? false;
    this.lineNumbering = options.lineNumbering ?? false;
    this.hidden = options.hidden ?? false;
    this.value = options.value ?? "";
    this.cursorPosition = { x: this.rawValue.at(-1)?.length ?? 0, y: this.rawValue.length - 1 ?? 0 };
    this.drawnObjects = {};

    this.placeholder = options.placeholder;
    if (this.placeholder) {
      this.#placeholder = this.placeholder.split("\n");
    }

    this.theme.placeholder = options.theme?.placeholder ?? emptyStyle;
    this.theme.highlightedLine = hierarchizeTheme(options.theme?.highlightedLine);
    this.theme.lineNumbers = hierarchizeTheme(options.theme?.lineNumbers);

    this.on("keyPress", textboxKeyboardHandler(this));
  }

  get value(): string {
    return this.rawValue.join("\n");
  }

  set value(value: string) {
    const split = value.split("\n");
    this.rawValue = this.multiline ? split : [split.join("")];
  }

  draw(): void {
    super.draw();
    // TODO: rewrite this to better suit new canvas possibilities

    const { canvas } = this.tui;

    let { column, row, width, height } = this.rectangle;
    const textLineOffset = `${this.rawValue.length}`.length;

    if (this.lineNumbering) {
      column += textLineOffset;
      width -= textLineOffset;
    }

    if (!this.value && !this.placeholder) return;
    const isPlaceholder = !this.value;
    const textArray = isPlaceholder ? this.#placeholder! : this.rawValue;

    const textStyle = isPlaceholder && this.theme.placeholder
      ? (text: string) => this.style(this.theme.placeholder(text).replaceAll("\x1b[0m", ""))
      : this.style;

    const { x, y } = this.cursorPosition;

    const offsetX = Math.max(x - width + 1, 0);
    const offsetY = Math.max(y - height + 1, 0);

    const lineNumbersStyle = this.theme.lineNumbers[this.state];
    const highlightedLineStyle = this.theme.highlightedLine[this.state];

    for (const [i, line] of textArray.entries()) {
      if (i < offsetY) continue;
      if (i - offsetY >= height) break;

      let lineText = line.slice(offsetX, offsetX + width);
      lineText = this.hidden ? "*".repeat(lineText.length) : lineText;

      if (this.lineHighlighting && i === y && highlightedLineStyle !== emptyStyle) {
        canvas.drawBox({
          rectangle: {
            column,
            row: row + i - offsetY,
            width,
            height: 1,
          },
          style: highlightedLineStyle,
          dynamic: this.forceDynamicDrawing,
          zIndex: this.zIndex,
        });
      }

      canvas.drawText({
        rectangle: {
          column,
          row: row + i - offsetY,
        },
        value: lineText,
        style: textStyle,
        zIndex: this.zIndex,
      });

      if (!this.lineNumbering) continue;

      const rowNumber = `${i + 1}`;
      const rowNumberText = this.lineNumbering ? (rowNumber + " ".repeat(textLineOffset - rowNumber.length)) : "";

      canvas.drawText({
        rectangle: {
          column: column - textLineOffset,
          row: row + i - offsetY,
        },
        value: rowNumberText,
        style: lineNumbersStyle,
        dynamic: this.forceDynamicDrawing,
        zIndex: this.zIndex,
      });
    }

    if (this.state === "base") return;

    canvas.drawText({
      rectangle: {
        column: column + Math.min(x, width - 1),
        row: row + Math.min(y, height - 1),
      },
      style: textStyle,
      value: "\x1b[7m" + (textArray[y][x] ?? " ") + "\x1b[0m",
      dynamic: this.forceDynamicDrawing,
      zIndex: this.zIndex,
    });
  }

  interact(): void {
    this.state = "focused";
  }
}
