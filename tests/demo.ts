import * as Tui from "../mod.ts";
import type { TuiStyler } from "../mod.ts";

const styler: TuiStyler = {
  foreground: "white",
  background: "blue",
};

const tui = Tui.createTui(Deno.stdin, Deno.stdout, styler);

const tb = Tui.createTextbox(tui, {
  rectangle: {
    column: 10,
    row: 1,
    height: 1,
    width: 10,
  },
  hidden: false,
  multiline: false,
  styler: {
    background: "red",
    foreground: "white",
    active: {
      background: "green",
      foreground: "white",
    },
    border: {
      background: "yellow",
      foreground: "cyan",
    },
    focused: {
      foreground: "green",
      background: "lightWhite",
    },
  },
});

tui.components.focused = tb;

Tui.createButton(tui, {
  rectangle: {
    column: 5,
    row: 5,
    width: 10,
    height: 5,
  },
  text: "hello",
  styler: {
    background: "red",
    foreground: "white",
    active: {
      background: "green",
      foreground: "white",
    },
  },
});

Tui.createCheckbox(tui, {
  column: 2,
  row: 2,
  styler: {
    background: "red",
    foreground: "white",
    active: {
      background: "green",
      foreground: "white",
    },
    border: {
      background: "yellow",
      foreground: "green",
    },
  },
});

tui.emitter.emit("drawLoop");
