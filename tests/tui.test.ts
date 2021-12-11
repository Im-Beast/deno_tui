import { createTui } from "../src/tui.ts";
import { getStaticValue } from "../src/util.ts";
import { assertEquals, canvas, styler } from "./deps.ts";

const createOptions = {
  styler,
  canvas,
  invalidProperty: "wow",
};

export const tui = createTui(Deno.stdin, Deno.stdout, createOptions);

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
      "draw",
      "stopDrawing",
      "rectangle",
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
