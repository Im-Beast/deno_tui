// Copyright 2021 Im-Beast. All rights reserved. MIT license.
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

/** Not interactive menu component */
export type MenuComponent = ExtendedTuiComponent<
  "menu",
  /** Height of the menu */
  { height: number }
>;

/**
 * Create MenuComponent
 *
 * It is not interactive by default
 *
 * It automatically distributes menu* components
 * @param object - parent of the created box, either Tui instance or other component
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * const menu = createMenu(tui, {});
 * ```
 */
export function createMenu(
  object: TuiObject,
  options: CreateMenuOptions,
): MenuComponent {
  let height = 1;
  const menu: MenuComponent = createComponent(object, {
    name: "menu",
    interactive: false,
    get rectangle() {
      return {
        ...object.rectangle,
        height,
      };
    },
    drawPriority: 1,
    draw() {
      height = menu.height;
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
          Object.assign(
            child.rectangle,
            {
              column: offsetX,
              row: offsetY,
              width: textWidth(String(child.label?.text ?? child.label)),
              height: 1,
            },
          );

          if (offsetX + child.rectangle.width > width) {
            offsetX = 1;
            offsetY++;
          } else {
            offsetX += child.rectangle.width + 1;
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
