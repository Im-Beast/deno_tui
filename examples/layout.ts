// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { crayon } from "https://deno.land/x/crayon@3.3.3/mod.ts";

import { Tui } from "../src/tui.ts";
import { handleInput } from "../src/input.ts";
import { handleKeyboardControls, handleMouseControls } from "../src/controls.ts";

import { Button } from "../src/components/button.ts";

import { Computed, GridLayout, VerticalLayout } from "../mod.ts";

const tui = new Tui({
  style: crayon.bgBlack,
  refreshRate: 1000 / 60,
});

handleInput(tui);
handleMouseControls(tui);
handleKeyboardControls(tui);
tui.dispatch();
tui.run();

const layout = new GridLayout(
  {
    pattern: [
      ["a", "b", "c"],
      ["d", "b", "f"],
      ["g", "h", "f"],
      ["i", "i", "i"],
      ["j", "k", "l"],
    ],
    gapX: 2,
    gapY: 1,
    rectangle: tui.rectangle,
  },
);

const elements = ["a", "b", "c", "d", "f", "g", "h", "i", "j", "k", "l"] as const;
let h = 0;
let i = 0;
for (const layoutId of elements) {
  const rectangle = layout.element(layoutId);

  i++;
  h += 360 / elements.length;

  const button = new Button({
    parent: tui,
    theme: {
      base: crayon.bgHsl(~~h, 60, 40),
      focused: crayon.bgHsl(~~h, 50, 50),
      active: crayon.bgHsl(~~h, 100, 70),
    },
    rectangle,
    zIndex: 360 - ~~h,
  });

  button.on("mousePress", ({ drag, movementX, movementY }) => {
    if (drag) {
      const rect = button.rectangle.value;
      rect.column += movementX;
      rect.row += movementY;
    }
  });
}
