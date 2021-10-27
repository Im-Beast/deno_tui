import { createComponent } from "../tui_component.ts";
import { TuiRectangle } from "../types.ts";
import { CreateBoxOptions } from "./box.ts";
import { createButton } from "./button.ts";
import { textPixelWidth } from "./label.ts";
import { MenuComponent } from "./menu.ts";

export type CreateMenuItemOptions = Omit<CreateBoxOptions, "rectangle"> & {
  text: string;
};

// TODO: Make them stack instead of overflowing
export function createMenuItem(
  object: MenuComponent,
  options: CreateMenuItemOptions,
) {
  const widths = [
    0,
    ...object.components.tree.map((component) => component.rectangle.width),
  ];
  const cols = [
    0,
    ...object.components.tree.map((component) => component.rectangle.column),
  ];

  const rectangle: TuiRectangle = {
    column: Math.max(
      object.rectangle.column +
        widths.reduce((a, b) => a + b + 1),
      Math.max(...cols),
    ),
    row: object.rectangle.row,
    width: textPixelWidth(options.text),
    height: 1,
  };

  const menuItem = createComponent(object, {
    name: "menuItem",
    interactive: true,
    rectangle,
    ...options,
  });

  createButton(menuItem, {
    interactive: false,
    rectangle,
    ...options,
    styler: {
      ...options.styler,
      border: undefined,
    },
    focusedWithin: [menuItem, ...options.focusedWithin],
  });

  return menuItem;
}
