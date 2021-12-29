// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { createComponent, ExtendedComponent } from "../tui_component.ts";
import { CreateBoxOptions } from "./box.ts";
import { createButton } from "./button.ts";
import { MenuComponent } from "./menu.ts";

interface MenuItemExtension {
  label: {
    text: string;
  };
}

/** Interactive menuItem component */
export type MenuItemComponent = ExtendedComponent<
  "menuItem",
  MenuItemExtension
>;

export type CreateMenuItemOptions =
  & Omit<CreateBoxOptions, "rectangle">
  & MenuItemExtension;

/**
 * Create MenuItem
 *
 * It is interactive by default
 *
 * It gets automatically placed by menu
 * @param parent - parent of the created box, must be MenuComponent
 * @param options
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * const menu = createMenu(tui, {});
 * createMenuItem(menu, {
 *  label: "Hello"
 * });
 * ```
 */
export function createMenuItem(
  parent: MenuComponent,
  options: CreateMenuItemOptions,
): MenuItemComponent {
  const menuItem = createComponent(parent, {
    name: "menuItem",
    interactive: true,
    rectangle: {
      width: 0,
      height: 0,
      column: 0,
      row: 0,
    },
    drawPriority: 3,
    ...options,
  }, {
    label: options.label,
  });

  createButton(menuItem, {
    ...options,
    interactive: false,
    get rectangle() {
      return menuItem.rectangle;
    },
    get label() {
      return menuItem.label;
    },
    get styler() {
      return menuItem.styler;
    },
    focusedWithin: [menuItem, ...menuItem.focusedWithin],
  });

  return menuItem;
}
