import { drawRectangle } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
  TuiComponent,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { getStaticValue } from "../util.ts";

export type BoxComponent = TuiComponent<"box">;

export type CreateBoxOptions = Omit<
  CreateComponentOptions,
  "interactive" | "name" | "draw"
>;

export function createBox(
  object: TuiObject,
  options: CreateBoxOptions,
): BoxComponent {
  const box = createComponent(object, {
    name: "box",
    interactive: false,
    ...options,
    draw() {
      drawRectangle(object.canvas, {
        ...getStaticValue(box.rectangle),
        styler: getCurrentStyler(box),
      });
    },
  });

  return box;
}
