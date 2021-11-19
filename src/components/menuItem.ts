import { createComponent, ExtendedTuiComponent } from "../tui_component.ts";
import { Dynamic } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";
import { createButton } from "./button.ts";
import { MenuComponent } from "./menu.ts";

export type MenuItemComponent = ExtendedTuiComponent<"menuItem", {
  text: Dynamic<string>;
}>;

export interface CreateMenuItemOptions
  extends Omit<CreateBoxOptions, "rectangle"> {
  text: Dynamic<string>;
}

export function createMenuItem(
  object: MenuComponent,
  options: CreateMenuItemOptions,
): MenuItemComponent {
  const menuItem = createComponent(object, {
    name: "menuItem",
    rectangle: {
      width: 0,
      height: 0,
      column: 0,
      row: 0,
    },
    ...options,
  }, {
    text: options.text,
  });

  createButton(menuItem, {
    ...options,
    rectangle: () => getStaticValue(menuItem.rectangle),
    text: () => getStaticValue(menuItem.text),
    styler: {
      ...options.styler,
      frame: undefined,
    },
  });

  return menuItem;
}
