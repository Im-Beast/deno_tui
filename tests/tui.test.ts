// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { createCanvas } from "../src/canvas.ts";
import { createTui } from "../src/tui.ts";
import { getStaticValue } from "../src/util.ts";
import { assertEquals, styler } from "./deps.ts";

const canvas = createCanvas({
  filler: " ",
  writer: Deno.stdout,
  size: {
    rows: 30,
    columns: 30,
  },
});

const createOptions = {
  styler,
  canvas,
  invalidProperty: "wow",
};

const tui = createTui(Deno.stdin, Deno.stdout, createOptions);

Deno.test("TuiInstance: create tui", () => {
  assertEquals(
    Object.getOwnPropertyNames(tui),
    [
      "id",
      "emitter",
      "on",
      "once",
      "off",
      "styler",
      "size",
      "rectangle",
      "refreshRate",
      "children",
      "components",
      "selected",
      "canvas",
      "reader",
      "writer",
    ],
  );
});

Deno.test("TuiInstance: size", () => {
  const size = getStaticValue(tui.size);
  assertEquals(size, getStaticValue(tui.canvas.size));

  const { width: columns, height: rows } = tui.rectangle();
  assertEquals(size, { columns, rows });
});
