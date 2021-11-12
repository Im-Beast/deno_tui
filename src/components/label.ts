import { drawText } from "../canvas.ts";
import { createComponent, getCurrentStyler } from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { CreateBoxOptions } from "./box.ts";

// This function was created by sindresorhus: https://github.com/sindresorhus/is-fullwidth-code-point/blob/main/index.js
export function isFullWidth(codePoint: number) {
  // Code points are derived from:
  // https://unicode.org/Public/UNIDATA/EastAsianWidth.txt
  return (
    codePoint >= 0x1100 &&
    (codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (0x2e80 <= codePoint && codePoint <= 0x3247 && codePoint !== 0x303f) ||
      (0x3250 <= codePoint && codePoint <= 0x4dbf) ||
      (0x4e00 <= codePoint && codePoint <= 0xa4c6) ||
      (0xa960 <= codePoint && codePoint <= 0xa97c) ||
      (0xac00 <= codePoint && codePoint <= 0xd7a3) ||
      (0xf900 <= codePoint && codePoint <= 0xfaff) ||
      (0xfe10 <= codePoint && codePoint <= 0xfe19) ||
      (0xfe30 <= codePoint && codePoint <= 0xfe6b) ||
      (0xff01 <= codePoint && codePoint <= 0xff60) ||
      (0xffe0 <= codePoint && codePoint <= 0xffe6) ||
      (0x1b000 <= codePoint && codePoint <= 0x1b001) ||
      (0x1f200 <= codePoint && codePoint <= 0x1f251) ||
      (0x20000 <= codePoint && codePoint <= 0x3fffd))
  );
}

export function textPixelWidth(text: string): number {
  let width = 0;
  for (let i = 0; i < text.length; ++i) {
    width += isFullWidth(text.charCodeAt(i)) ? 2 : 1;
  }
  return width;
}

export interface TextAlign {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
}

export interface CreateLabelOptions extends CreateBoxOptions {
  text: string | (() => string);
  textAlign: TextAlign;
}

export function createLabel(
  object: TuiObject,
  options: CreateLabelOptions,
) {
  let drawFuncs: (() => void)[] = [];
  let lastText = "";
  const label = createComponent(object, {
    name: "label",
    interactive: false,
    ...options,
    draw() {
      const currentText = typeof options.text === "function"
        ? options.text()
        : options.text;

      if (currentText !== lastText) {
        updateDrawFuncs(currentText);
        lastText = currentText;
      }

      for (const draw of drawFuncs) {
        draw();
      }
    },
  });

  const updateDrawFuncs = (text: string) => {
    const { column, row, width, height } = label.staticRectangle;
    drawFuncs = [];

    const lines = text.split("\n");
    for (let [i, line] of lines.entries()) {
      let textWidth = textPixelWidth(line);
      while (textWidth > width) {
        line = line.slice(0, width);
        textWidth = textPixelWidth(line);
      }

      let c = column;
      let r = row;

      switch (options.textAlign.horizontal) {
        case "center":
          c = Math.floor(column + (width / 2 - textWidth / 2));
          break;
        case "right":
          r = column + width;
          break;
      }

      switch (options.textAlign.vertical) {
        case "center":
          r = Math.floor(row + height / 2 - lines.length / 2);
          break;
        case "bottom":
          r = row + height;
          break;
      }

      drawFuncs.push(() =>
        drawText(object.canvas, {
          column: c,
          row: r + i,
          text: line,
          styler: getCurrentStyler(label),
        })
      );
    }
  };

  return label;
}
