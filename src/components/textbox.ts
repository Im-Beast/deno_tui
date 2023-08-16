// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Box } from "./box.ts";
import { ComponentOptions } from "../component.ts";

import { BoxPainter } from "../canvas/painters/box.ts";
import { TextPainter } from "../canvas/painters/text.ts";
import { Theme } from "../theme.ts";
import { DeepPartial, Rectangle } from "../types.ts";
import { cropToWidth, insertAt } from "../utils/strings.ts";
import { clamp } from "../utils/numbers.ts";
import { Computed, Effect, Signal } from "../signals/mod.ts";
import { signalify } from "../utils/signals.ts";
import { KeyPressEvent } from "../input_reader/types.ts";

export interface CursorPosition {
  x: number;
  y: number;
}

export interface TextBoxTheme extends Theme {
  value: Theme;
  cursor: Theme;
  /** Style for numbers counting textbox rows */
  lineNumbers: Theme;
  /** Style for currently selected text row */
  highlightedLine: Theme;
}

export interface TextBoxOptions extends ComponentOptions {
  text?: string | Signal<string>;
  validator?: RegExp | Signal<RegExp>;
  theme: DeepPartial<TextBoxTheme, "cursor">;
  multiCodePointSupport?: boolean | Signal<boolean>;
  /** Whether to highlight currently selected text row */
  lineHighlighting?: boolean | Signal<boolean>;
  /** Whether to number textbox rows */
  lineNumbering?: boolean | Signal<boolean>;
  /** Function that defines what key does what while textbox is focused/active */
  keyboardHandler?: (keyPress: KeyPressEvent) => void;
}

/**
 * Component for creating interactive mutliline text input
 *
 * If you need singleline input use `Input` component.
 *
 * @example
 * ```ts
 * new TextBox({
 *  parent: tui,
 *  lineNumbering: true,
 *  lineHighlighting: true,
 *  theme: {
 *    base: crayon.bgGreen,
 *    focused: crayon.bgLightGreen,
 *    active: crayon.bgYellow,
 *  },
 *  rectangle: {
 *    column: 1,
 *    row: 1,
 *    width: 10,
 *    height: 5,
 *  },
 *  zIndex: 0,
 * });
 * ```
 *
 * It supports validating input, e.g. number input would look like this:
 * @example
 * ```ts
 * new TextBox({
 *  ...,
 *  validator: /\d+/,
 * });
 * ```
 *
 * If you need to use emojis or other multi codepoint characters set `multiCodePointSupport` property to true.
 * @example
 * ```ts
 * new TextBox({
 *  ...,
 *  placeholder: "🧡",
 *  multiCodePointCharacter: true,
 * });
 * ```
 */
export class TextBox extends Box {
  declare drawnObjects: {
    box: BoxPainter;
    lines: TextPainter[];
    lineNumbers: TextPainter[];
    cursor: TextPainter<string>;
  };
  declare theme: TextBoxTheme;

  #textLines: Computed<string[]>;

  text: Signal<string>;
  lineNumbering: Signal<boolean>;
  lineHighlighting: Signal<boolean>;
  cursorPosition: Signal<CursorPosition>;
  multiCodePointSupport: Signal<boolean>;

  constructor(options: TextBoxOptions) {
    super(options);

    this.theme.value ??= this.theme;
    this.theme.lineNumbers ??= this.theme;
    this.theme.highlightedLine ??= this.theme;

    this.cursorPosition = new Signal({ x: 0, y: 0 }, { deepObserve: true });

    this.text = signalify(options.text ?? "");
    this.lineNumbering = signalify(options.lineNumbering ?? false);
    this.lineHighlighting = signalify(options.lineHighlighting ?? false);
    this.multiCodePointSupport = signalify(options.multiCodePointSupport ?? false);

    // FIXME: This creates unnecessary arrays each time it runs
    this.#textLines = new Computed(() => this.text.value.split("\n"));

    new Effect(() => {
      this.#updateLineDrawObjects();
    });

    this.on(
      "keyPress",
      options.keyboardHandler ?? (({ key, ctrl, meta }) => {
        if (ctrl || meta) return;

        const cursorPosition = this.cursorPosition.peek();
        const textLines = this.#textLines.peek();
        const textLine = textLines[cursorPosition.y] ??= "";

        let character: string;

        switch (key) {
          case "left":
            --cursorPosition.x;
            break;
          case "right":
            ++cursorPosition.x;
            break;
          case "up":
            --cursorPosition.y;
            break;
          case "down":
            if (textLines.length - 1 > cursorPosition.y) {
              ++cursorPosition.y;
            }
            break;
          case "home":
            cursorPosition.x = 0;
            return;
          case "end":
            cursorPosition.x = textLine.length;
            return;

          case "backspace":
            if (cursorPosition.x === 0) {
              if (cursorPosition.y === 0) return;
              textLines[cursorPosition.y - 1] += textLines[cursorPosition.y];
              textLines.splice(cursorPosition.y, 1);
              --cursorPosition.y;
              cursorPosition.x = textLines[cursorPosition.y].length;
            } else {
              textLines[cursorPosition.y] = textLine.slice(0, cursorPosition.x - 1) + textLine.slice(cursorPosition.x);
              cursorPosition.x = clamp(cursorPosition.x - 1, 0, textLine.length);
            }
            break;
          case "delete":
            textLines[cursorPosition.y] = textLine.slice(0, cursorPosition.x) + textLine.slice(cursorPosition.x + 1);

            if (cursorPosition.x === textLine.length && textLines.length - 1 > cursorPosition.y) {
              textLines[cursorPosition.y] += textLines[cursorPosition.y + 1];
              textLines.splice(cursorPosition.y + 1, 1);
            }
            break;
          case "return":
            ++cursorPosition.y;
            break;

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

        cursorPosition.y = clamp(cursorPosition.y, 0, textLines.length);
        cursorPosition.x = clamp(cursorPosition.x, 0, textLines[cursorPosition.y]?.length ?? 0);

        if (character!) {
          textLines[cursorPosition.y] = insertAt(textLine, cursorPosition.x, character);
          ++cursorPosition.x;
        }

        this.text.value = textLines.join("\n");
      }),
    );
  }

  draw(): void {
    super.draw();

    const { canvas } = this.tui;
    const { drawnObjects } = this;

    drawnObjects.lineNumbers = [];
    drawnObjects.lines = [];

    this.#updateLineDrawObjects();

    const cursorRectangle: Rectangle = { column: 0, row: 0, width: 1, height: 1 };
    const cursorText = [""];
    const cursor = new TextPainter({
      canvas,
      view: this.view,
      zIndex: this.zIndex,
      multiCodePointSupport: this.multiCodePointSupport,
      text: new Computed(() => {
        const cursorPosition = this.cursorPosition.value;
        const value = this.#textLines.value[cursorPosition.y];
        cursorText[0] = value?.[cursorPosition.x] ?? " ";
        return cursorText;
      }),
      style: new Computed(() => this.theme.cursor[this.state.value]),
      rectangle: new Computed(() => {
        const cursorPosition = this.cursorPosition.value;
        const { row, column, width, height } = this.rectangle.value;

        cursorRectangle.row = row + Math.min(cursorPosition.y, height - 1);

        if (this.lineNumbering.value) {
          const lineNumbersWidth = this.drawnObjects.lineNumbers[0].rectangle.peek().width;
          cursorRectangle.column = column + lineNumbersWidth + Math.min(cursorPosition.x, width - lineNumbersWidth - 1);
        } else {
          cursorRectangle.column = column + Math.min(cursorPosition.x, width - 1);
        }

        return cursorRectangle;
      }),
    });

    drawnObjects.cursor = cursor;
    cursor.draw();
  }

  interact(method: "keyboard" | "mouse"): void {
    this.state.value = "focused";
    super.interact(method);
  }

  #updateLineDrawObjects(): void {
    const { lineNumbers, lines } = this.drawnObjects;

    const { height } = this.rectangle.value;
    const lineNumbering = this.lineNumbering.value;

    if (!lines) return;
    const { canvas } = this.tui;
    const elements = lines.length;

    for (let offset = 0; offset < Math.max(height, elements); ++offset) {
      const lineNumber = lineNumbers[offset];
      if (!lineNumber && lineNumbering) {
        const lineNumberRectangle = { column: 0, row: 0, width: 0, height: 0 };
        const text = [""];
        const lineNumber = new TextPainter({
          canvas,
          view: this.view,
          zIndex: this.zIndex,
          multiCodePointSupport: this.multiCodePointSupport,
          style: new Computed(() => this.theme.lineNumbers[this.state.value]),
          text: new Computed(() => {
            const { height } = this.rectangle.value;
            const cursorPosition = this.cursorPosition.value;

            const lineNumber = offset + Math.max(cursorPosition.y - height + 1, 0) + 1;
            const maxLineNumber = this.#textLines.value.length;

            text[0] = `${lineNumber}`.padEnd(`${maxLineNumber}`.length, " ");
            return text;
          }),
          rectangle: new Computed(() => {
            const { row, column } = this.rectangle.value;
            lineNumberRectangle.column = column;
            lineNumberRectangle.row = row + offset;
            return lineNumberRectangle;
          }),
        });

        lineNumbers[offset] = lineNumber;
        lineNumber.draw();
      } else if (lineNumber && !lineNumbering) {
        lineNumber.erase();
        delete lineNumbers[offset];
      }

      const line = lines[offset];
      if (!line) {
        const lineRectangle = { column: 0, row: 0, width: 0, height: 0 };
        const text = [""];
        const line = new TextPainter({
          canvas,
          view: this.view,
          zIndex: this.zIndex,
          multiCodePointSupport: this.multiCodePointSupport,
          style: new Computed(() => {
            // associate computed with this.text
            this.text.value;

            const state = this.state.value;
            const highlightLine = this.lineHighlighting.value;
            const cursorPosition = this.cursorPosition.value;

            const offsetY = Math.max(cursorPosition.y - this.rectangle.value.height + 1, 0);
            const currentLine = offsetY + offset;

            if (highlightLine && cursorPosition.y === currentLine) {
              return this.theme.highlightedLine[state];
            } else return this.theme.value[state];
          }),
          text: new Computed(() => {
            const cursorPosition = this.cursorPosition.value;

            let { width, height } = this.rectangle.value;
            if (this.lineNumbering.value) {
              const lineNumbersWidth = this.drawnObjects.lineNumbers[0].rectangle.peek().width;
              width -= lineNumbersWidth;
            }

            const offsetX = cursorPosition.x - width + 1;
            const offsetY = Math.max(cursorPosition.y - height + 1, 0);

            const value = this.#textLines.value[offset + offsetY]?.replace("\t", " ") ?? "";

            text[0] = cropToWidth(offsetX > 0 ? value.slice(offsetX, cursorPosition.x) : value, width).padEnd(
              width,
              " ",
            );
            return text;
          }),
          rectangle: new Computed(() => {
            // associate computed with this.lineNumbering and this.#textLines
            this.lineNumbering.value;
            this.#textLines.value;

            const { row, column } = this.rectangle.value;
            lineRectangle.column = column;
            lineRectangle.row = row + offset;

            if (this.lineNumbering.value) {
              const lineNumbersWidth = this.drawnObjects.lineNumbers[0].rectangle.peek().width;
              lineRectangle.column += lineNumbersWidth;
            }

            return lineRectangle;
          }),
        });

        lines[offset] = line;
        line.draw();
      } else if (offset >= height) {
        line.erase();
        delete lines[offset];
      }
    }
  }
}
