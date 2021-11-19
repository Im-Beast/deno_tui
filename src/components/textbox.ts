import { CanvasStyler, drawPixel, drawText } from "../canvas.ts";
import {
  createComponent,
  ExtendedTuiComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { TuiStyler } from "../types.ts";
import { TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createBox, CreateBoxOptions } from "./box.ts";
import { createFrame } from "./frame.ts";
import { textPixelWidth } from "../util.ts";

export type TextboxComponent = ExtendedTuiComponent<
  "textbox",
  {
    value: string;
    hidden: boolean;
    multiline: boolean;
    styler: TuiStyler & {
      cursor?: CanvasStyler;
    };
  },
  "valueChange",
  string
>;

export interface CreateTextboxOptions extends CreateBoxOptions {
  hidden: boolean;
  multiline: boolean;
  styler: TuiStyler & {
    cursor?: CanvasStyler;
  };
}

export function createTextbox(
  object: TuiObject,
  options: CreateTextboxOptions,
): TextboxComponent {
  const position = {
    x: 0,
    y: 0,
  };

  const textbox: TextboxComponent = createComponent(object, {
    name: "textbox",
    interactive: true,
    draw() {
      const styler = getCurrentStyler(textbox);

      let text = textbox.hidden
        ? "*".repeat(textbox.value.length)
        : textbox.value;

      let textWidth = textPixelWidth(text);

      const { row, column, width, height } = getStaticValue(
        textbox.rectangle,
      );

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

      if (textbox.instance.selected.item?.id === textbox.id) {
        drawPixel(object.canvas, {
          column: column + Math.min(position.x, width - 1),
          row: row + Math.min(position.y, height - 1),
          value: textbox.value[position.x] || " ",
          styler: textbox.styler.cursor ||
            { foreground: "black", background: "white" },
        });
      }
    },
    drawPriority: 1,
    ...options,
  }, {
    value: "",
    hidden: options.hidden,
    multiline: options.multiline,
  });

  const focusedWithin = [textbox, ...textbox.focusedWithin];

  createBox(textbox, {
    ...options,
    focusedWithin,
  });

  if (textbox.styler.frame) {
    createFrame(textbox, {
      ...options,
      rectangle() {
        const rectangle = getStaticValue(textbox.rectangle);
        return {
          column: rectangle.column - 1,
          row: rectangle.row - 1,
          width: rectangle.width + 1,
          height: rectangle.height + 1,
        };
      },
      styler: textbox.styler.frame,
      focusedWithin,
    });
  }

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
