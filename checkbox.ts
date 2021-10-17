import { drawPixel } from "./canvas.ts";
import { createFrame } from "./frame.ts";

import {
  createComponent,
  TuiComponent,
  TuiInstance,
  TuiStyler,
} from "./tui.ts";

export type CreateCheckboxOptions = {
  styler: TuiStyler;
  column: number;
  row: number;
};

export type CheckboxComponent = TuiComponent<"stateChange", boolean> & {
  state: boolean;
};

export function createCheckbox(
  object: TuiInstance | TuiComponent,
  options: CreateCheckboxOptions,
): CheckboxComponent {
  const instance = Object.hasOwn(object, "instance")
    ? (<TuiComponent> object).instance
    : object as TuiInstance;

  const checkbox: CheckboxComponent = {
    ...createComponent<"stateChange", boolean>(
      object,
      {
        id: "checkbox",
        interactive: true,
        canvas: object.canvas,
        rectangle: {
          column: options.column,
          row: options.row,
          width: 1,
          height: 1,
        },
        styler: options.styler,
      },
    ),
    state: false,
  };

  const funcs: (() => void)[] = [];

  if (options.styler?.border) {
    const border = createFrame(
      checkbox,
      {
        rectangle: {
          column: options.column - 1,
          row: options.row - 1,
          width: 2,
          height: 2,
        },
        styler: options.styler.border,
      },
    );

    funcs.push(border.draw);
  }

  funcs.push(() => {
    const focused = instance.components.focused === checkbox;
    const active = checkbox.state || focused && instance.components.active;

    const currentStyler = (focused
      ? options.styler.focused
      : active
      ? options.styler.active
      : options.styler) || options.styler;

    drawPixel(instance.canvas, {
      column: options.column,
      row: options.row,
      value: active
        ? "✓"
        : "✗",
      styler: currentStyler,
    });
  });

  checkbox.draw = () => funcs.forEach((func) => func());

  instance.on("drawLoop", checkbox.draw);
  checkbox.on("redraw", checkbox.draw);

  return checkbox;
}
