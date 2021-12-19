// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  createCanvas,
  drawPixel,
  drawRectangle,
  drawText,
  renderChanges,
  renderFull,
} from "../../src/canvas.ts";

const canvas = createCanvas({
  filler: " ",
  writer: Deno.stdout,
  size: {
    rows: 30,
    columns: 30,
  },
  smartRender: false,
});

drawText(canvas, {
  column: 1,
  row: 1,
  text: "Hello world",
});

drawPixel(canvas, {
  column: 6,
  row: 7,
  value: "-",
});

drawRectangle(canvas, {
  column: 21,
  row: 17,
  height: 5,
  width: 8,
  value: "=",
});

const option = Deno.args[0];

switch (option) {
  case "changes":
    renderChanges(canvas);
    break;
  case "emptyChanges":
    renderChanges(canvas);
    break;
  case "full":
    renderFull(canvas);
    break;
}
