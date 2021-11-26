import { ExtendedTuiComponent } from "../tui_component.ts";
import { Dynamic } from "../types.ts";
import { getStaticValue } from "../util.ts";
import {
  ComboboxValue,
  createCombobox,
  CreateComboboxOptions,
} from "./combobox.ts";
import { MenuComponent } from "./menu.ts";

export type MenuListComponent = ExtendedTuiComponent<
  "menuList",
  {
    items: ComboboxValue[];
    value: ComboboxValue | number;
    label: Dynamic<string>;
  },
  "valueChange",
  ComboboxValue
>;

export interface CreateMenuListOptions
  extends Omit<CreateComboboxOptions, "rectangle"> {
  label: Dynamic<string>;
}

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
    textAlign: {
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
