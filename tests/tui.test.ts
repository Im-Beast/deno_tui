import { createTui } from "../src/tui.ts";
import { TuiStyler } from "../src/types.ts";
import { getStaticValue } from "../src/util.ts";
import { assertEquals } from "./deps.ts";

export const styler: TuiStyler = {
  foreground: "\x1b[32m",
  background: "\x1b[43m",
  active: {
    foreground: "\x1b[31m",
    background: "\x1b[42m",
  },
  focused: {
    foreground: "\x1b[30m",
    background: "\x1b[41m",
  },
};

const createOptions = {
  styler,
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
