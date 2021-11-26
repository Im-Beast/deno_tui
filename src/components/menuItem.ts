import { createComponent, ExtendedTuiComponent } from "../tui_component.ts";
import { Dynamic } from "../types.ts";
import { getStaticValue } from "../util.ts";
import { CreateBoxOptions } from "./box.ts";
import { createButton } from "./button.ts";
import { MenuComponent } from "./menu.ts";

export type MenuItemComponent = ExtendedTuiComponent<"menuItem", {
  label: Dynamic<string>;
}>;

export interface CreateMenuItemOptions
  extends Omit<CreateBoxOptions, "rectangle"> {
  label: Dynamic<string>;
}

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
