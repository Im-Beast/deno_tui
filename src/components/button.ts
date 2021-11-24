import {
  createComponent,
  ExtendedTuiComponent,
  removeComponent,
} from "../tui_component.ts";
import { Dynamic, TextAlign, TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { createBox, CreateBoxOptions } from "./box.ts";
import { createFrame, FrameComponent } from "./frame.ts";
import { createLabel, LabelComponent } from "./label.ts";

export type ButtonComponent = ExtendedTuiComponent<"button", {
  text?: Dynamic<string>;
  textAlign?: Dynamic<TextAlign>;
}>;

export interface CreateButtonOptions extends CreateBoxOptions {
  text?: Dynamic<string>;
  textAlign?: Dynamic<TextAlign>;
}

export function createButton(
  object: TuiObject,
  options: CreateButtonOptions,
): ButtonComponent {
  let frame: FrameComponent | undefined;
  let label: LabelComponent | undefined;

  const button: ButtonComponent = createComponent(object, {
    name: "button",
    interactive: true,
    ...options,
    draw() {
      if (!frame && getStaticValue(button.styler).frame) {
        frame = createFrame(button, {
          ...options,
          rectangle() {
            const rectangle = getStaticValue(button.rectangle);
            return {
              column: rectangle.column - 1,
              row: rectangle.row - 1,
              width: rectangle.width + 1,
              height: rectangle.height + 1,
            };
          },
          styler() {
            const styler = getStaticValue(button.styler);

            if (frame && !styler.frame) {
              removeComponent(frame);
              frame = undefined;
            }

            return styler.frame || {};
          },
          focusedWithin: [button, ...button.focusedWithin],
        });
      }

      if (!label && button.text) {
        label = createLabel(button, {
          drawPriority: button.drawPriority + 1,
          text() {
            const value = getStaticValue(button.text);

            if (label && typeof value !== "string") {
              removeComponent(label);
              label = undefined;
            }

            return value || "";
          },
          rectangle: button.rectangle,
          textAlign: () =>
            getStaticValue(
              button.textAlign || ({
                horizontal: "center",
                vertical: "center",
              }),
            ),
          styler: () => getStaticValue(button.styler),
          focusedWithin: [button, ...button.focusedWithin],
        });
      }
    },
  }, {
    text: options.text,
    textAlign: options.textAlign,
  });

  createBox(button, {
    ...options,
    focusedWithin: [button, ...button.focusedWithin],
    styler: () => getStaticValue(button.styler),
    rectangle: () => getStaticValue(button.rectangle),
  });

  return button;
}
