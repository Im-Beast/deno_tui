// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { ExtendedComponent } from "../tui_component.ts";
import { Dynamic, TextAlign } from "../types.ts";
import {
  ComboboxValue,
  createCombobox,
  CreateComboboxOptions,
} from "./combobox.ts";
import { MenuComponent } from "./menu.ts";

/** Interactive menuList component */
export type MenuListComponent = ExtendedComponent<
  "menuList",
  {
    /** Items available to choose in combobox */
    items: ComboboxValue[];
    /**
     * Currently selected item
     * - When you're setting value you can use either value of the item or index pointing to it in `items` property
     * - When component processes change it will return value of the item
     */
    value: ComboboxValue | number;
    /** Index of currently selected item */
    readonly valueIndex: (() => number);
    /** Label's text displayed on the button */
    label: Dynamic<string>;
    /**
     * Position of the label
     * Requires `label` property to be set.
     */
    labelAlign?: TextAlign;
    expandItemsWidth?: boolean;
  },
  "valueChange",
  ComboboxValue
>;

export interface CreateMenuListOptions
  extends Omit<CreateComboboxOptions, "rectangle" | "label"> {
  label: {
    text: string;
  };
}

/**
 * Create MenuList
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
 * const menu = createMenu(...);
 * createMenuList(menu, {
 *  label: "File",
 *  items: ["Open", "Save", "Close"],
 * });
 * ```
 */
export function createMenuList(
  parent: MenuComponent,
  options: CreateMenuListOptions,
): MenuListComponent {
  const menuList = createCombobox(parent, {
    ...options,
    get styler() {
      return options.styler ?? parent.styler;
    },
    rectangle: {
      column: 0,
      row: 0,
      width: 0,
      height: 0,
    },
    label: options.label,
    expandItemsWidth: true,
    drawPriority: 3,
  }) as unknown as MenuListComponent;

  Object.defineProperty(menuList, "name", {
    value: "menuList",
  });

  return menuList;
}
