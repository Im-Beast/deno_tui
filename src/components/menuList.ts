// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { ExtendedTuiComponent } from "../tui_component.ts";
import { Dynamic, TextAlign } from "../types.ts";
import { getStaticValue } from "../util.ts";
import {
  ComboboxValue,
  createCombobox,
  CreateComboboxOptions,
} from "./combobox.ts";
import { MenuComponent } from "./menu.ts";

/** Interactive menuList component */
export type MenuListComponent = ExtendedTuiComponent<
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
    labelAlign?: Dynamic<TextAlign>;
    expandItemsWidth?: Dynamic<boolean>;
  },
  "valueChange",
  ComboboxValue
>;

export interface CreateMenuListOptions
  extends Omit<CreateComboboxOptions, "rectangle"> {
  /** Label's text displayed on the button */
  label: Dynamic<string>;
}

/**
 * Create MenuList
 * It is interactive by default
 * It gets automatically placed by menu
 * @param object - parent of the created box, must be MenuComponent
 * @param options
 */
export function createMenuList(
  object: MenuComponent,
  options: CreateMenuListOptions,
): MenuListComponent {
  const menuList = createCombobox(object, {
    ...options,
    styler: options.styler,
    rectangle: {
      column: 0,
      height: 0,
      row: 0,
      width: 0,
    },
    labelAlign: {
      horizontal: "left",
      vertical: "top",
    },
    expandItemsWidth: true,
  }) as unknown as MenuListComponent;
  menuList.name = "menuList";
  const prevStyler = menuList.styler;
  menuList.styler = () => ({
    ...getStaticValue(prevStyler),
    frame: undefined,
  });

  return menuList;
}
