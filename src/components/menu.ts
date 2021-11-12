import { drawRectangle } from "../canvas.ts";
import { getStaticRectangle } from "../tui_component.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
  TuiComponent,
} from "../tui_component.ts";
import { StaticTuiRectangle, TuiObject } from "../types.ts";

export type CreateMenuOptions = Omit<
  CreateComponentOptions,
  "interactive" | "name" | "rectangle"
>;

export interface MenuComponent extends TuiComponent {
  readonly name: "menu";
  offset: number;
}

export function createMenu(
  object: TuiObject,
  options: CreateMenuOptions,
): MenuComponent {
  const rectangle: StaticTuiRectangle = {
    ...getStaticRectangle(object.rectangle),
    height: 1,
  };

  const menu = createComponent(object, {
    name: "menu",
    interactive: false,
    rectangle,
    draw() {
      for (const { draw } of menu.children) {
        draw();
      }

      const styler = getCurrentStyler(menu);

      drawRectangle(menu.canvas, {
        ...getStaticRectangle(object.rectangle),
        height: 1,
        styler,
      });
    },
    ...options,
  });

  return { offset: 0, ...menu } as MenuComponent;
}
