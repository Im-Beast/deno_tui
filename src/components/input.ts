import { Box } from "./box.ts";
import { ComponentOptions } from "../component.ts";

import { BoxObject } from "../canvas/box.ts";
import { TextObject } from "../canvas/text.ts";
import { Theme } from "../theme.ts";
import { DeepPartial } from "../types.ts";
import { insertAt, textWidth } from "../utils/strings.ts";
import { clamp } from "../utils/numbers.ts";

export interface InputTheme extends Theme {
  cursor: Theme;
  value: Theme;
}

export interface InputOptions extends ComponentOptions {
  value?: string;
  theme: DeepPartial<InputTheme, "cursor">;
  validator?: RegExp;
  multiCodePointSupport?: boolean;
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

    this.cursorPosition = 0;
    this.theme.value ??= this.theme;
    this.value = options.value ?? "";
    this.validator = options.validator;
    this.multiCodePointSupport = options.multiCodePointSupport ?? false;

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

  draw(): void {
    super.draw();

    const { canvas } = this.tui;

    const textRectangle = { column: 0, row: 0, width: 0 };
    const text = new TextObject({
      canvas,
      view: () => this.view,
      zIndex: () => this.zIndex,
      style: () => this.theme.value[this.state],
      value: () => {
        const { cursorPosition } = this;
        const value = this.value.replace("\t", " ");
        const offsetX = cursorPosition - this.rectangle.width + 1;
        return offsetX > 0 ? value.slice(offsetX, cursorPosition) : value;
      },
      multiCodePointSupport: () => this.multiCodePointSupport,
      rectangle: () => {
        const { row, column, width } = this.rectangle;
        textRectangle.column = column;
        textRectangle.row = row;
        textRectangle.width = Math.min(textWidth(this.value), width);
        return textRectangle;
      },
      overwriteWidth: true,
    });

    const cursorRectangle = { column: 0, row: 0, width: 1 };
    const cursor = new TextObject({
      canvas,
      view: () => this.view,
      zIndex: () => this.zIndex,
      value: () => this.value[this.cursorPosition] ?? " ",
      style: () => this.theme.cursor[this.state],
      multiCodePointSupport: () => this.multiCodePointSupport,
      rectangle: () => {
        const { row, column, width } = this.rectangle;
        cursorRectangle.column = column + Math.min(this.cursorPosition, width - 1);
        cursorRectangle.row = row;
        return cursorRectangle;
      },
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
