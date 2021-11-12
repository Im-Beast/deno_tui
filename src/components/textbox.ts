import { drawText } from "../canvas.ts";
import {
  createComponent,
  getCurrentStyler,
  TuiComponent,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { createBox, CreateBoxOptions } from "./box.ts";
import { createFrame } from "./frame.ts";
import { textPixelWidth } from "./label.ts";

export interface CreateTextboxOptions extends CreateBoxOptions {
  hidden: boolean;
  multiline: boolean;
}

export interface TextboxComponent extends TuiComponent<"valueChange", string> {
  value: string;
}

export function createTextbox(
  object: TuiObject,
  options: CreateTextboxOptions,
): TextboxComponent {
  const { row, column, width, height } = typeof options.rectangle === "function"
    ? options.rectangle()
    : options.rectangle;

  const textbox = {
    value: "",
    ...createComponent<"valueChange", string>(object, {
      name: "textbox",
      interactive: true,
      draw() {
        for (const { draw } of textbox.children) {
          draw();
        }

        const styler = getCurrentStyler(textbox);

        let text = options.hidden
          ? "*".repeat(textbox.value.length)
          : textbox.value;

        let textWidth = textPixelWidth(text);
        if (textWidth > width) {
          text = text.slice(0, width);
          textWidth = textPixelWidth(text);
        }

        drawText(object.canvas, {
          column,
          row,
          text,
          styler,
        });
      },
      drawPriority: 1,
      ...options,
    }),
  };

  const focusedWithin = [textbox, ...(options.focusedWithin || [])];

  createBox(textbox, {
    ...options,
    focusedWithin,
  });

  if (options.styler.border) {
    createFrame(textbox, {
      ...options,
      rectangle: {
        column: column - 1,
        row: row - 1,
        width: width + 1,
        height: height + 1,
      },
      styler: options.styler.border,
      focusedWithin,
    });
  }

  const position = {
    x: 0,
    y: 0,
  };

  const moveKey = (direction: "up" | "down" | "left" | "right") => {
    switch (direction) {
      case "left":
        position.x = Math.max(--position.x, 0);
        break;
      case "right":
        position.x = Math.min(++position.x, textbox.value.length);
        break;
      case "up":
        position.y = Math.max(--position.y, 0);
        break;
      case "down":
        position.y = Math.min(
          ++position.y,
          textbox.value.split("\n").length,
        );
        break;
    }
  };

  const pushCharacter = (character: string) => {
    textbox.value = textbox.value.slice(0, position.x) + character +
      textbox.value.slice(position.x);
    moveKey("right");
  };

  textbox.on("key", ({ key, ctrl, meta }) => {
    const startValue = textbox.value;

    if (!key) return;
    if (!ctrl && !meta && key.length === 1) {
      pushCharacter(key);
    }

    switch (key) {
      case "space":
        pushCharacter(" ");
        break;
      case "left":
      case "right":
      case "up":
      case "down":
        moveKey(key);
        break;
      case "backspace":
        textbox.value = textbox.value.substr(0, position.x - 1) +
          textbox.value.substr(position.x);
        moveKey("left");
        break;
      case "delete":
        textbox.value = textbox.value.substr(0, position.x) +
          textbox.value.substr(position.x + 1);
        break;
      case "home":
        position.x = 0;
        break;
      case "end":
        position.x = textbox.value.length;
        break;
    }

    textbox.emitter.emit("valueChange", startValue);
  });

  return textbox;
}
