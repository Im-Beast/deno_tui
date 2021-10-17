import { createBox } from "./box.ts";
import { drawText } from "./canvas.ts";
import { createFrame } from "./frame.ts";
import { textPixelWidth } from "./label.ts";

import {
  createComponent,
  TuiComponent,
  TuiInstance,
  TuiRectangle,
  TuiStyler,
} from "./tui.ts";
import { Key } from "./types.ts";

export type CreateTextboxOptions = {
  styler: TuiStyler;
  hidden: boolean;
  multiline: boolean;
  rectangle: TuiRectangle;
};

export type TextboxComponent = TuiComponent<"valueChange", boolean> & {
  value: string;
};

export function createTextbox(
  object: TuiInstance | TuiComponent,
  options: CreateTextboxOptions,
): TextboxComponent {
  const { column, row, width, height } = options.rectangle;

  const instance = Object.hasOwn(object, "instance")
    ? (<TuiComponent> object).instance
    : object as TuiInstance;

  const textbox: TextboxComponent = {
    ...createComponent<"valueChange", boolean>(
      object,
      {
        id: "textbox",
        interactive: true,
        canvas: object.canvas,
        rectangle: {
          column,
          row,
          width,
          height,
        },
        styler: options.styler,
      },
    ),
    value: "",
  };

  const funcs: (() => void)[] = [];

  const box = createBox(textbox, {
    rectangle: options.rectangle,
    styler: options.styler,
    focusingItems: [textbox],
  });

  funcs.push(box.draw);

  if (options.styler?.border) {
    const border = createFrame(
      textbox,
      {
        rectangle: {
          column: column - 1,
          row: row - 1,
          width: width + 1,
          height: height + 1,
        },
        styler: options.styler.border,
      },
    );

    funcs.push(border.draw);
  }

  funcs.push(() => {
    const focused = instance.components.focused === textbox;
    const active = focused && instance.components.active;

    const currentStyler = (focused
      ? options.styler.focused
      : active
      ? options.styler.active
      : options.styler) || options.styler;

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
      styler: currentStyler,
    });
  });

  textbox.draw = () => funcs.forEach((func) => func());

  const keyPosition = {
    x: 0,
    y: 0,
  };

  function moveKey(direction: "up" | "down" | "left" | "right") {
    switch (direction) {
      case "left":
        keyPosition.x = Math.max(--keyPosition.x, 0);
        break;
      case "right":
        keyPosition.x = Math.min(++keyPosition.x, textbox.value.length);
        break;
      case "up":
        keyPosition.y = Math.max(--keyPosition.y, 0);
        break;
      case "down":
        keyPosition.y = Math.min(
          ++keyPosition.y,
          textbox.value.split("\n").length,
        );
        break;
    }
  }

  const pushCharacter = (character: string) => {
    textbox.value = textbox.value.slice(0, keyPosition.x) + character +
      textbox.value.slice(keyPosition.x);

    moveKey("right");
  };

  textbox.on("keyPress", (keyPress) => {
    if (typeof keyPress === "object") {
      const key = keyPress.key as Key;

      if (!keyPress.ctrl && !keyPress.meta && key.length === 1) {
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
          textbox.value = textbox.value.substr(0, keyPosition.x - 1) +
            textbox.value.substr(keyPosition.x);
          moveKey("left");
          break;
        case "delete":
          textbox.value = textbox.value.substr(0, keyPosition.x) +
            textbox.value.substr(keyPosition.x + 1);
          break;
        case "home":
          keyPosition.x = 0;
          break;
        case "end":
          keyPosition.x = textbox.value.length;
          break;
      }

      textbox.emitter.emit("redraw");
    }
  });

  instance.on("drawLoop", textbox.draw);
  textbox.on("redraw", textbox.draw);

  return textbox;
}
