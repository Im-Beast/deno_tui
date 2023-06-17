// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { crayon } from "https://deno.land/x/crayon@3.3.3/mod.ts";

import { Tui } from "../src/tui.ts";
import { handleInput } from "../src/input.ts";
import { handleKeyboardControls, handleMouseControls } from "../src/controls.ts";

import { Button } from "../src/components/button.ts";

import { Layout } from "../src/layout.ts";
import { Computed } from "../mod.ts";

const tui = new Tui({
  style: crayon.bgBlack,
  refreshRate: 1000 / 60,
});

handleInput(tui);
handleMouseControls(tui);
handleKeyboardControls(tui);
tui.dispatch();
tui.run();

const layoutRectangle = { column: 0, row: 0, width: 0, height: 0 };
const layout = new Layout(
  {
    pattern: `iaaabb
iaaabb
iaaabb
iccccc
iddeef
iddeef
ighhhh`,
    rectangle: new Computed(() => {
      const { columns: width, rows: height } = tui.canvas.size.value;
      layoutRectangle.width = width;
      layoutRectangle.height = height;
      return layoutRectangle;
    }),
  },
);

const elements = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
let h = 0;
for (const layoutId of elements) {
  const rectangle = layout.element(layoutId);
  h += 360 / elements.length;

  const button = new Button({
    parent: tui,
    theme: {
      base: crayon.bgHsl(h, 60, 40),
      focused: crayon.bgHsl(h, 50, 50),
      active: crayon.bgHsl(h, 100, 70),
    },
    rectangle,
    label: {
      text: new Computed(() => {
        const rect = rectangle.value;
        return `${layoutId.toUpperCase()}, c: ${rect.column}, r: ${rect.row}\n w:${rect.width}, h: ${rect.height}`;
      }),
    },
    zIndex: 0,
  });

  button.on("mousePress", ({ drag, movementX, movementY }) => {
    if (drag) {
      const rect = button.rectangle.value;
      rect.column += movementX;
      rect.row += movementY;
    }
  });
}
