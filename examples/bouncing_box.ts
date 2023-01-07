// Copyright 2022 Im-Beast. All rights reserved. MIT license.
// Simple example showing box bouncing similiar to famous DVD Screensaver

import { crayon } from "https://deno.land/x/crayon@3.3.2/mod.ts";

import { Tui } from "../mod.ts";
import { Box } from "../src/components/box.ts";

const tui = new Tui({
  style: crayon.bgBlack.white,
});

tui.canvas.refreshRate = 1000 / 60;

tui.dispatch();

let hue = 0;
const box = new Box({
  tui,
  theme: {
    base: (text: string) => crayon.bgHsl(++hue % 360, 50, 50)(text),
  },
  rectangle: {
    column: 1,
    row: 1,
    width: 6,
    height: 3,
  },
  forceDynamicDrawing: true,
});

const moveDirection = {
  x: 1,
  y: 1,
};

tui.run();

tui.on("render", () => {
  // Frequency of this type being dispatched is based on `tui.updateRate`
  // If you would like to support lower or higher update rates you should calculate delta time and base box movement on that
  const canvasSize = tui.canvas.size;

  if (box.rectangle.row + box.rectangle.height >= canvasSize.rows || box.rectangle.row <= 0) {
    moveDirection.y *= -1;
  }

  if (box.rectangle.column + box.rectangle.width >= canvasSize.columns || box.rectangle.column <= 0) {
    moveDirection.x *= -1;
  }

  box.rectangle.column += moveDirection.x;
  box.rectangle.row += moveDirection.y;
});
