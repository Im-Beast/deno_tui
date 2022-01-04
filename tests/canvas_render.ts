// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import {
  createCanvas,
  drawPixel,
  drawRectangle,
  drawText,
  renderChanges,
  renderFull,
  setDebugMode,
} from "../mod.ts";
import { encodeBuffer } from "./deps.ts";

setDebugMode(true);

export const canvas = createCanvas({
  filler: " ",
  writer: Deno.stdout,
  size: { rows: 30, columns: 30 },
  smartRender: false,
});

drawText(canvas, {
  column: 1,
  row: 1,
  text: "Hello world",
  styler: { foreground: "\x1b[32m" },
});

drawText(canvas, { column: 32, row: 18, text: "Ｈi" });

drawPixel(canvas, { column: 6, row: 7, value: "-" });

drawRectangle(canvas, { column: 21, row: 17, height: 5, width: 8, value: "=" });

const option = Deno.args[0];

switch (option) {
  case "full":
    renderFull(canvas);
    break;
  case "changes":
    renderChanges(canvas);
    break;
  default:
    throw new Error("Missing or unsupported option");
}

console.log(encodeBuffer(canvas.frameBuffer));
