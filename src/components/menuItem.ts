// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { createComponent, ExtendedTuiComponent } from "../tui_component.ts";
import { Dynamic } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";
import { createButton } from "./button.ts";
import { MenuComponent } from "./menu.ts";

interface MenuItemExtension {
  label: Dynamic<string>;
}

/** Interactive menuItem component */
export type MenuItemComponent = ExtendedTuiComponent<
  "menuItem",
  MenuItemExtension
>;

export type CreateMenuItemOptions =
  & Omit<CreateBoxOptions, "rectangle">
  & MenuItemExtension;

/**
 * Create MenuItem
 * It is interactive by default
 * It gets automatically placed by menu
 * @param object - parent of the created box, must be MenuComponent
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
  object: MenuComponent,
  options: CreateMenuItemOptions,
): MenuItemComponent {
  const menuItem = createComponent(object, {
    name: "menuItem",
    interactive: true,
    rectangle: {
      width: 0,
      height: 0,
      column: 0,
      row: 0,
    },
    ...options,
  }, {
    label: options.label,
  });

  const button = createButton(menuItem, {
    ...options,
    rectangle: () => getStaticValue(menuItem.rectangle),
    label: () => getStaticValue(menuItem.label),
    styler: () => ({ ...getStaticValue(menuItem.styler), frame: undefined }),
    focusedWithin: [menuItem, ...menuItem.focusedWithin],
  });
  button.interactive = false;

  return menuItem;
}
