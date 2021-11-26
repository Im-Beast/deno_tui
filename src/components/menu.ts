import { drawRectangle } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  ExtendedTuiComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { textWidth } from "../util.ts";
import { getStaticValue } from "../util.ts";

export type CreateMenuOptions = Omit<
  CreateComponentOptions,
  "interactive" | "name" | "rectangle"
>;

export type MenuComponent = ExtendedTuiComponent<
  "menu",
  { height: number }
>;

export function createMenu(
  object: TuiObject,
  options: CreateMenuOptions,
): MenuComponent {
  const menu: MenuComponent = createComponent(object, {
    name: "menu",
    interactive: false,
    rectangle: () => ({
      ...getStaticValue(object.rectangle),
      height: 1,
    }),
    drawPriority: 1,
    draw() {
      drawRectangle(menu.canvas, {
        ...getStaticValue(menu.rectangle),
        height: menu.height,
        styler: getCurrentStyler(menu),
      });

      let offsetX = 1;
      let offsetY = 0;
      const { width } = getStaticValue(menu.rectangle);
      for (
        const child of menu.children
      ) {
        if (child.name === "menuItem" || child.name === "menuList") {
          child.rectangle = {
            column: offsetX,
            row: offsetY,
            width: textWidth(String(getStaticValue(child.label))),
            height: 1,
          };

          if (offsetX + child.rectangle.width > width) {
            offsetX = 1;
            offsetY++;
          } else {
            offsetX += getStaticValue(child.rectangle).width + 1;
          }
        }
      }
      menu.height = 1 + offsetY;
    },
    ...options,
  }, {
    height: 1,
  });

  return menu;
}
