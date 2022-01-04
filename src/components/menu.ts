// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { drawRectangle } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  ExtendedComponent,
  getCurrentStyler,
} from "../tui_component.ts";
import { TuiObject } from "../types.ts";
import { textWidth } from "../util.ts";

export type CreateMenuOptions = Omit<
  CreateComponentOptions,
  "interactive" | "name" | "rectangle"
>;

/** Not interactive menu component */
export type MenuComponent = ExtendedComponent<
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
 * @param parent - parent of the created box, either tui or other component
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * const menu = createMenu(tui, {});
 * ```
 */
export function createMenu(
  parent: TuiObject,
  options: CreateMenuOptions,
): MenuComponent {
  let height = 1;
  const menu: MenuComponent = createComponent(parent, options, {
    name: "menu",
    interactive: false,
    get rectangle() {
      return {
        ...parent.rectangle,
        height,
      };
    },
    drawPriority: 1,
    draw(this: MenuComponent) {
      height = menu.height;

      drawRectangle(menu.tui.canvas, {
        ...menu.rectangle,
        height: menu.height,
        styler: getCurrentStyler(menu),
      });

      let offsetX = 1;
      let offsetY = 0;

      const { width } = menu.rectangle;

      for (const child of menu.children) {
        const text = child.label?.text;

        Object.assign(
          child.rectangle,
          {
            column: offsetX,
            row: offsetY,
            width: text ? textWidth(text) : child.width,
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
      menu.height = 1 + offsetY;
    },
    height: 1,
  });

  return menu;
}
