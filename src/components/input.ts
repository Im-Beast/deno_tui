import { Box } from "./box.ts";
import { ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";
import { TextObject } from "../canvas/text.ts";
import { Theme } from "../theme.ts";
import { DeepPartial } from "../types.ts";
import { insertAt, textWidth } from "../utils/strings.ts";
import { clamp } from "../utils/numbers.ts";

export interface InputOptions extends ComponentOptions {
  value?: string;
  theme: DeepPartial<InputTheme>;
  validator?: RegExp;
  multiCodePointSupport?: boolean;
}

export interface InputTheme extends Theme {
  cursor: Theme;
  value: Theme;
}

export class Input extends Box {
  declare drawnObjects: {
    box: BoxObject;
    text: TextObject;
    cursor: TextObject;
  };
  declare theme: InputTheme;

  value: string;
  multiCodePointSupport: boolean;

  validator?: RegExp;

  cursorPosition: number;

  constructor(options: InputOptions) {
    super(options);
    this.value = options.value ?? "";
    this.validator = options.validator;
    this.multiCodePointSupport = options.multiCodePointSupport ?? false;

    this.cursorPosition = 0;
    this.on("keyPress", ({ key, ctrl, meta }) => {
      if (ctrl || meta) return;

      const { cursorPosition, validator, value } = this;

      let character = "";
      switch (key) {
        case "backspace":
          if (cursorPosition === 0) return;
          this.value = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
          this.cursorPosition = clamp(this.cursorPosition - 1, 0, value.length);
          return;
        case "delete":
          this.value = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
          return;
        case "left":
          this.cursorPosition = clamp(this.cursorPosition - 1, 0, value.length);
          return;
        case "right":
          this.cursorPosition = clamp(this.cursorPosition + 1, 0, value.length);
          return;
        case "home":
          this.cursorPosition = 0;
          return;
        case "end":
          this.cursorPosition = value.length;
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
      this.value = insertAt(value, cursorPosition, character);
      this.cursorPosition = clamp(this.cursorPosition + 1, 0, this.value.length);
    });
  }

  update(): void {
    super.update();

    const { zIndex, state, theme, multiCodePointSupport, cursorPosition } = this;
    const { text, cursor } = this.drawnObjects;
    const { column, row, width } = this.rectangle;

    // Tabs aren't predictable with how they'll render
    const value = this.value.replace("\t", " ");

    const valueWidth = textWidth(value);

    text.rectangle.row = row;
    text.rectangle.column = column;
    text.rectangle.width = Math.min(valueWidth, width);

    const offsetX = cursorPosition - width + 1;
    text.value = offsetX > 0 ? value.slice(offsetX, cursorPosition) : value;
    text.zIndex = zIndex;
    text.style = theme.value[state];
    text.multiCodePointSupport = multiCodePointSupport;
    text.overwriteWidth = true;

    cursor.rectangle.row = row;
    cursor.rectangle.column = column + Math.min(cursorPosition, width - 1);
    cursor.rectangle.width = 1;
    cursor.value = value[cursorPosition] ?? " ";
    cursor.zIndex = zIndex;
    cursor.style = theme.cursor[state];
    cursor.multiCodePointSupport = multiCodePointSupport;
    cursor.overwriteWidth = true;
  }

  draw(): void {
    super.draw();

    const { row, column } = this.rectangle;

    const { theme, state, zIndex, multiCodePointSupport } = this;
    const { canvas } = this.tui;

    const text = new TextObject({
      canvas,
      value: this.value,
      style: theme.value[state],
      zIndex,
      rectangle: { row, column },
      multiCodePointSupport,
      overwriteWidth: true,
    });

    const cursor = new TextObject({
      canvas,
      value: " ",
      style: theme.cursor[state],
      zIndex,
      rectangle: { row, column },
      multiCodePointSupport,
      overwriteWidth: true,
    });

    this.drawnObjects.text = text;
    this.drawnObjects.cursor = cursor;

    text.draw();
    cursor.draw();
  }

  interact(method: "keyboard" | "mouse"): void {
    const interactionInterval = Date.now() - this.lastInteraction.time;

    this.state = this.state === "focused" && (interactionInterval < 500 || method === "keyboard")
      ? "active"
      : "focused";

    super.interact(method);
  }
}
