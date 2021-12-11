// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { CanvasStyler, drawPixel, drawText } from "../canvas.ts";
import {
  createComponent,
  ExtendedTuiComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { Dynamic, TuiStyler } from "../types.ts";
import { TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createBox, CreateBoxOptions } from "./box.ts";
import { textWidth } from "../util.ts";

export type TextboxTuiStyler = TuiStyler & {
  cursor?: CanvasStyler;
};

export type TextboxComponent = ExtendedTuiComponent<
  "textbox",
  {
    /** Textbox content, each index of array starting by 1 represents newline */
    value: string[];
    /** `textbox.value` converted into a string using `textbox.value.join("\n")` */
    string: () => string;
    /** Whether textbox content is hidden by asteriks (*) */
    hidden: boolean;
    /** Whether textbox is multiline */
    multiline: boolean;
    /** Definition on how component looks like */
    styler: Dynamic<TextboxTuiStyler>;
  },
  "valueChange",
  string[]
>;

export interface CreateTextboxOptions extends CreateBoxOptions {
  /** Textbox content, each index of array starting by 1 represents newline */
  value?: string[];
  /** Whether textbox content is hidden by asteriks (*) */
  hidden: boolean;
  /** Whether textbox is multiline */
  multiline: boolean;
  /** Definition on how component looks like */
  styler: Dynamic<TextboxTuiStyler>;
}

/**
 * Create TextboxComponent
 * It is interactive by default
 * @param object - parent of the created box, either Tui instance or other component
 * @param options
 */
export function createTextbox(
  object: TuiObject,
  options: CreateTextboxOptions,
): TextboxComponent {
  const position = { x: 0, y: 0 };

  const textbox: TextboxComponent = createComponent(object, {
    name: "textbox",
    interactive: true,
    draw() {
      const { row, column, width, height } = getStaticValue(
        textbox.rectangle,
      );

      for (let [i, line] of textbox.value.entries()) {
        if (i >= height) break;
        if (textbox.hidden) {
          line = "*".repeat(line.length);
        }

        let tw = textWidth(line);
        while (tw > width) {
          line = line.slice(0, -1);
          tw = textWidth(line);
        }

        drawText(object.canvas, {
          column,
          row: row + i,
          text: line,
          styler: getCurrentStyler(textbox),
        });
      }

      if (textbox.instance.selected.item?.id === textbox.id) {
        const currentCharacter = textbox.value?.[position.y]?.[position.x];
        const cursorCol = column + Math.min(position.x, width - 1);
        drawPixel(object.canvas, {
          column: cursorCol,
          row: row + position.y,
          value: currentCharacter
            ? textbox.hidden ? "*" : currentCharacter
            : " ",
          styler: (getStaticValue<TextboxTuiStyler>(textbox.styler)?.cursor) ||
            { foreground: "\x1b[30m", background: "\x1b[47m" },
        });
      }
    },
    drawPriority: 1,
    ...options,
  }, {
    value: options?.value?.length ? options.value : [""],
    string: () => textbox.value.join("\n"),
    hidden: options.hidden,
    multiline: options.multiline,
  });

  createBox(textbox, {
    ...options,
    focusedWithin: [textbox, ...textbox.focusedWithin],
    styler: () => getStaticValue(textbox.styler),
  });

  textbox.on("key", ({ key, shift, ctrl, meta }) => {
    if (!key || shift) return;

    const startValue = [...textbox.value];
    const rectangle = getStaticValue(textbox.rectangle);
    const startY = position.y;

    if (!ctrl && !meta && key.length === 1) {
      textbox.value[position.y] ||= "";
      textbox.value[position.y] =
        textbox.value[position.y].slice(0, position.x) + key +
        textbox.value[position.y].slice(position.x);
      ++position.x;
      textbox.emitter.emit("valueChange", startValue);
      return;
    }

    switch (key) {
      case "up":
        position.y = Math.max(0, position.y - 1);
        textbox.value[position.y] ||= "";
        position.x = textbox.value[position.y].length >= position.x
          ? position.x
          : textbox.value[position.y].length;
        break;
      case "down":
        position.y = Math.min(position.y + 1, rectangle.height - 1);
        textbox.value[position.y] ||= "";
        position.x = textbox.value[position.y].length >= position.x
          ? position.x
          : textbox.value[position.y].length;
        break;
      case "left":
        position.x = Math.max(0, position.x - 1);
        break;
      case "right":
        position.x = Math.min(position.x + 1, textbox.value[position.y].length);
        break;
      case "return":
        position.y = Math.min(position.y + 1, rectangle.height - 1);
        if (position.y !== startY) {
          textbox.value[position.y] ||= "";
          position.x = textbox.value[position.y].length;
        }
        break;
      case "backspace":
        if (position.x === 0) {
          position.y = Math.max(0, position.y - 1);
          position.x = textbox.value[position.y].length;
        } else {
          textbox.value[position.y] ||= "";
          textbox.value[position.y] =
            textbox.value[position.y].substr(0, position.x - 1) +
            textbox.value[position.y].substr(position.x);
          position.x = Math.max(0, position.x - 1);
        }
        break;
      case "delete":
        textbox.value[position.y] =
          textbox.value[position.y].substr(0, position.x) +
          textbox.value[position.y].substr(position.x + 1);
        break;
      case "home":
        position.x = 0;
        break;
      case "end":
        position.x = textbox.value[position.y].length;
        break;
      default:
        return;
    }

    textbox.emitter.emit("valueChange", startValue);
  });

  return textbox;
}
