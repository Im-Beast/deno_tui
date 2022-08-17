// Copyright 2022 Im-Beast. All rights reserved. MIT license.
/** Simple example showing box bouncing similiar to famous DVD Screensaver */
import { crayon } from "https://deno.land/x/crayon@3.3.2/mod.ts";

import { Tui } from "../mod.ts";
import { BoxComponent } from "../src/components/box.ts";

const tui = new Tui({
  style: crayon.bgBlack.white,
});

let hue = 0;
const box = new BoxComponent({
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
});

const moveDirection = {
  x: 1,
  y: 0.5,
};

for await (const event of tui.run()) {
  // Frequency of this type being dispatched is based on `tui.updateRate`
  // If you would like to support lower or higher update rates you should calculate delta time and base box movement on that
  if (event.type === "update") {
    const canvasSize = tui.canvas.size;

    if (box.rectangle.row + box.rectangle.height >= canvasSize.rows || box.rectangle.row <= 0) {
      moveDirection.y *= -1;
    }

    if (box.rectangle.column + box.rectangle.width >= canvasSize.columns || box.rectangle.column <= 0) {
      moveDirection.x *= -1;
    }

    box.rectangle.column += moveDirection.x;
    box.rectangle.row += moveDirection.y;
  }
}
