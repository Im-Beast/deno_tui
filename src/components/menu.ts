import { drawPixel } from "../canvas.ts";
import {
  createComponent,
  CreateComponentOptions,
  getCurrentStyler,
  TuiComponent,
} from "../tui_component.ts";
import { TuiObject, TuiRectangle } from "../types.ts";

export type CreateMenuOptions = Omit<
  CreateComponentOptions,
  "interactive" | "name" | "rectangle"
>;

export type MenuComponent = TuiComponent<never, void> & {
  readonly name: "menu";
  offset: number;
};

export function createMenu(
  object: TuiObject,
  options: CreateMenuOptions,
): MenuComponent {
  const rectangle: TuiRectangle = {
    ...object.rectangle,
    height: 1,
  };

  const menu = createComponent(object, {
    name: "menu",
    interactive: false,
    rectangle,
    draw() {
      menu.components.tree.forEach((component) => component.draw());

      const { row, column, width, height } = rectangle;
      const styler = getCurrentStyler(menu);

      for (let r = row; r < row + height; ++r) {
        for (let c = column; c < column + width; ++c) {
          drawPixel(object.canvas, {
            column: c,
            row: r,
            value: " ",
            styler,
          });
        }
      }
    },
    ...options,
  });

  return { offset: 0, ...menu } as MenuComponent;
}
