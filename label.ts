import { createComponent } from "./tui.ts";

import type {
  TuiComponent,
  TuiInstance,
  TuiRectangle,
  TuiStyler,
} from "./tui.ts";

import { drawText } from "./canvas.ts";

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

export type CreateLabelOptions = {
  styler: TuiStyler;
  rectangle: TuiRectangle;
  align: {
    horizontal: "left" | "middle" | "right";
    vertical: "top" | "middle" | "bottom";
  };
};

export function createLabel(
  object: TuiInstance | TuiComponent,
  text: string,
  options: CreateLabelOptions,
): TuiComponent {
  const { column, row, width, height } = options.rectangle;

  const instance = Object.hasOwn(object, "instance")
    ? (<TuiComponent> object).instance
    : object as TuiInstance;

  const label = createComponent(
    object,
    {
      id: "label",
      canvas: object.canvas,
      rectangle: options.rectangle,
      styler: options.styler,
    },
  );

  const lines = text.split("\n");

  const funcs = lines.map((line, i) => {
    let textWidth = textPixelWidth(line);
    if (textWidth > width) {
      line = line.slice(0, width);
      textWidth = textPixelWidth(line);
    }

    let currentColumn = options.rectangle.column;
    let currentRow = options.rectangle.row;

    switch (options.align.horizontal) {
      case "left":
        break;
      case "middle":
        currentColumn = Math.floor(column + (width / 2 - textWidth / 2));
        break;
      case "right":
        currentColumn = column + width;
        break;
    }

    switch (options.align.vertical) {
      case "top":
        break;
      case "middle":
        currentRow = Math.floor(row + height / 2 - lines.length / 2);
        break;
      case "bottom":
        currentRow = row + height;
        break;
    }

    return () => {
      const focused = instance.components.focused === label;
      const active = focused && instance.components.active;

      const currentStyler = (focused
        ? options.styler.focused
        : active
        ? options.styler.active
        : options.styler) || options.styler;

      drawText(
        object.canvas,
        {
          column: currentColumn,
          row: currentRow + i,
          text: line,
          styler: currentStyler,
        },
      );
    };
  });

  label.draw = () => {
    funcs.forEach((func) => func());
  };

  instance.on("drawLoop", label.draw);
  label.on("redraw", label.draw);

  return label;
}
