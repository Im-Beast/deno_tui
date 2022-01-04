// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  compileStyler,
  createBox,
  createTui,
  hsl,
  loopDrawing,
  TuiStyler,
} from "../mod.ts";

const tui = createTui({
  reader: Deno.stdin,
  writer: Deno.stdout,
  styler: compileStyler<TuiStyler>({
    background: "black",
  }),
});

loopDrawing(tui);

let hue = 0;
const box = createBox(tui, {
  rectangle: {
    column: 0,
    row: 0,
    height: 5,
    width: 10,
  },
  styler: {
    background: hsl(++hue % 360, 50, 50, true),
  },
});

const direction = {
  x: 1,
  y: 1,
};

tui.on("draw", () => {
  const rectangle = box.rectangle;
  rectangle.column += direction.x;
  rectangle.row += direction.y;

  if (
    rectangle.column < 0 ||
    (rectangle.column + rectangle.width) > tui.rectangle.width
  ) {
    direction.x *= -1;
  }

  if (
    rectangle.row < 0 ||
    (rectangle.row + rectangle.height) > tui.rectangle.height
  ) {
    direction.y *= -1;
  }
});
