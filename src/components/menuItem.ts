import { createComponent } from "../tui_component.ts";
import { TuiRectangle } from "../types.ts";
import { CreateBoxOptions } from "./box.ts";
import { createButton } from "./button.ts";
import { textPixelWidth } from "./label.ts";
import { MenuComponent } from "./menu.ts";

export interface CreateMenuItemOptions
  extends Omit<CreateBoxOptions, "rectangle"> {
  text: string;
}

export function createMenuItem(
  object: MenuComponent,
  options: CreateMenuItemOptions,
) {
  let currentRow = object.children.length
    ? object.children.sort((a, b) => b.rectangle.row - a.rectangle.row)[0]
      .rectangle.row
    : object.rectangle.row;

  let w = object.rectangle.column;
  let c = 0;
  for (const component of object.children) {
    const { row, column, width } = component.rectangle;
    if (row !== currentRow) continue;
    w += width + 1;
    c = Math.max(column, c);
  }
  let column = Math.max(w, c);

  const width = textPixelWidth(options.text);

  if (column + width > object.rectangle.column + object.rectangle.width) {
    column = object.rectangle.column;
    currentRow += 1;
    object.rectangle.height += 1;
  }

  const rectangle: TuiRectangle = {
    column,
    row: currentRow,
    width,
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
    focusedWithin: [menuItem, ...(options.focusedWithin || [])],
  });

  return menuItem;
}
