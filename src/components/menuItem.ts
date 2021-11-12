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
    ? object.children.sort((a, b) =>
      b.staticRectangle.row - a.staticRectangle.row
    )[0]
      .staticRectangle.row
    : object.staticRectangle.row;

  let w = object.staticRectangle.column;
  let c = 0;
  for (const component of object.children) {
    const { row, column, width } = component.staticRectangle;
    if (row !== currentRow) continue;
    w += width + 1;
    c = Math.max(column, c);
  }
  let column = Math.max(w, c);

  const width = textPixelWidth(options.text);

  if (
    column + width >
      object.staticRectangle.column + object.staticRectangle.width
  ) {
    column = object.staticRectangle.column;
    currentRow += 1;
    object.staticRectangle.height += 1;
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
