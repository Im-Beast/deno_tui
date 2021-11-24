import { drawText } from "../canvas.ts";
import {
  createComponent,
  ExtendedTuiComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { Dynamic, TextAlign, TuiObject } from "../types.ts";
import { getStaticValue, textWidth } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";

export type LabelComponent = ExtendedTuiComponent<"label", {
  text: Dynamic<string>;
  textAlign: Dynamic<TextAlign>;
}>;

export interface CreateLabelOptions extends CreateBoxOptions {
  text: Dynamic<string>;
  textAlign: Dynamic<TextAlign>;
}

export function createLabel(
  object: TuiObject,
  options: CreateLabelOptions,
): LabelComponent {
  let drawers: (() => void)[];
  const lastData = {
    text: "",
    rect: options.rectangle,
  };

  const label: LabelComponent = createComponent(object, {
    name: "label",
    interactive: false,
    ...options,
    draw() {
      const currentText = getStaticValue(label.text);
      const currentRect = getStaticValue(label.rectangle);

      if (currentText !== lastData.text || currentRect !== lastData.rect) {
        updateDrawFuncs(currentText);
        lastData.text = currentText;
        lastData.rect = currentRect;
      }

      for (const draw of drawers) {
        draw();
      }
    },
  }, {
    text: options.text,
    textAlign: options.textAlign,
  });

  const updateDrawFuncs = (text: string) => {
    drawers = [];

    const { column, row, width, height } = getStaticValue(label.rectangle);

    const lines = text.split("\n");
    const textAlign = getStaticValue(label.textAlign);

    for (let [i, line] of lines.entries()) {
      let tw = textWidth(line);
      while (tw > width) {
        line = line.slice(0, -1);
        tw = textWidth(line);
      }

      let c = column;
      let r = row + i;

      switch (textAlign.horizontal) {
        case "center":
          c = Math.floor(column + (width / 2 - tw / 2));
          break;
        case "right":
          r = column + width;
          break;
      }

      switch (textAlign.vertical) {
        case "center":
          r = Math.floor(row + height / 2 - lines.length / 2);
          break;
        case "bottom":
          r = row + height;
          break;
      }

      drawers.push(() =>
        drawText(object.canvas, {
          column: c,
          row: r,
          text: line,
          styler: getCurrentStyler(label),
        })
      );
    }
  };

  return label;
}
